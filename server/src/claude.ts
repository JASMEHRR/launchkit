import OpenAI from "openai";

// NVIDIA's inference API is OpenAI-compatible, so we drive it with the OpenAI
// SDK pointed at NVIDIA's base URL. The key (NVIDIA_API_KEY, an "nvapi-..."
// token) lives only on this server; the frontend never talks to NVIDIA
// directly. The file is still named claude.ts to avoid churn in the imports —
// its public surface (structuredGenerate + ClaudeRefusalError) is unchanged.
// Constructed lazily on first use: the OpenAI SDK validates the key at
// construction time, but this module is imported before index.ts finishes
// loading the project-root .env, so building it eagerly would throw at boot.
let _client: OpenAI | null = null;
function nvidiaClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1",
      // Free-tier generation can be slow (larger endpoints run 40-60s); give
      // each request room and let the SDK retry transient failures.
      timeout: 180_000,
      maxRetries: 2,
    });
  }
  return _client;
}

// Resolved lazily (at request time), NOT at import time: this module is
// imported before index.ts finishes loading the project-root .env, so reading
// the env eagerly would miss NVIDIA_MODEL and fall back to the default.
// Override with NVIDIA_MODEL in .env to try a different free model.
// NOTE: avoid meta/llama-3.3-70b-instruct — it has no free-tier capacity and
// hangs the request indefinitely instead of erroring.
export function modelName(): string {
  return process.env.NVIDIA_MODEL || "meta/llama-3.1-8b-instruct";
}

// Free-tier models cap completion length well below Anthropic's; the callers
// still pass their old generous numbers, so we clamp to something the hosted
// models actually accept to avoid 400s.
const MAX_OUTPUT_TOKENS = 8192;

/** The model declined the request. Surfaced as HTTP 422. */
export class ClaudeRefusalError extends Error {
  constructor(message = "The model declined to answer this request. Try rephrasing your input.") {
    super(message);
    this.name = "ClaudeRefusalError";
  }
}

interface StructuredOpts {
  system: string;
  prompt: string;
  /** JSON schema describing the expected output shape. */
  schema: Record<string, unknown>;
  /**
   * Was Anthropic's server-side web search. NVIDIA's OpenAI-compatible API has
   * no equivalent, so this is accepted for source compatibility but ignored —
   * the model answers from its own knowledge.
   */
  useWebSearch?: boolean;
  maxTokens?: number;
}

/**
 * Pull the JSON object out of a model response. Handles the common ways free
 * models wrap it: ```json fences, a leading <think>…</think> block (reasoning
 * models), or prose around the object. Falls back to the outermost {…} span.
 */
function extractJson(raw: string): string {
  let text = raw.trim();

  // Drop a reasoning preamble if present.
  const thinkEnd = text.lastIndexOf("</think>");
  if (thinkEnd !== -1) text = text.slice(thinkEnd + "</think>".length).trim();

  // Strip a surrounding markdown code fence.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  if (text.startsWith("{") && text.endsWith("}")) return text;

  // Last resort: grab the outermost brace span.
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) return text.slice(first, last + 1);

  return text;
}

/**
 * One structured-output call to the model. Instructs it to emit JSON matching
 * `schema`, requests JSON response mode, and returns the parsed payload.
 *
 * NVIDIA's hosted models don't enforce a JSON schema server-side the way
 * Anthropic's output_config did, so we (a) hand the schema to the model in the
 * system prompt, (b) ask for response_format json_object, and (c) parse
 * defensively.
 */
/**
 * Node's HTTP client (which the OpenAI SDK sits on top of) has a well-known,
 * widely-reported flakiness where it throws ECONNRESET / APIConnectionError
 * on some requests even though the exact same request works fine via curl —
 * this hits OpenAI's own API too, not just NVIDIA's. A retried request
 * almost always succeeds, so we retry connection failures a few times with
 * a short backoff before giving up.
 */
async function withConnectionRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!(err instanceof OpenAI.APIConnectionError)) throw err;
      if (i < attempts - 1) {
        const delayMs = 400 * 2 ** i; // 400ms, 800ms, 1600ms
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastErr;
}

export async function structuredGenerate<T>(opts: StructuredOpts): Promise<T> {
  const system = `${opts.system}

You must respond with a single JSON object and nothing else — no prose, no markdown code fences, no commentary. The JSON must conform exactly to this JSON Schema (match property names and types precisely, include every required field):

${JSON.stringify(opts.schema, null, 2)}`;

  const nvidia = nvidiaClient();
  let completion;
  try {
    completion = await withConnectionRetry(() =>
      nvidia.chat.completions.create({
        model: modelName(),
        max_tokens: Math.min(opts.maxTokens ?? MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS),
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: opts.prompt },
        ],
      })
    );
  } catch (err) {
    // Some models reject response_format json_object; retry once without it,
    // leaning on the schema instructions + defensive parsing instead.
    if (err instanceof OpenAI.BadRequestError) {
      completion = await withConnectionRetry(() =>
        nvidia.chat.completions.create({
          model: modelName(),
          max_tokens: Math.min(opts.maxTokens ?? MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS),
          temperature: 0.6,
          messages: [
            { role: "system", content: system },
            { role: "user", content: opts.prompt },
          ],
        })
      );
    } else {
      throw err;
    }
  }

  const choice = completion.choices[0];

  if (choice?.finish_reason === "content_filter") {
    throw new ClaudeRefusalError();
  }
  if (choice?.finish_reason === "length") {
    throw new Error("The model response was truncated (hit the token limit). Try again or simplify the input.");
  }

  const content = choice?.message?.content;
  if (!content) {
    throw new Error(`The model returned no text output (finish_reason: ${choice?.finish_reason ?? "unknown"}).`);
  }

  try {
    return JSON.parse(extractJson(content)) as T;
  } catch {
    throw new Error("The model did not return valid JSON. Try again — free models occasionally break format.");
  }
}
