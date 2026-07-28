import "dotenv/config";
import dns from "node:dns";
// Prefer IPv4 when connecting out. Without this, Node's Happy-Eyeballs can
// spend ~10-15s attempting IPv6 to NVIDIA's endpoint before falling back,
// adding that latency to every AI call.
dns.setDefaultResultOrder("ipv4first");
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import OpenAI from "openai";
import { aiRouter } from "./routes/ai.js";
import { dataRouter } from "./routes/data.js";
import { ClaudeRefusalError } from "./claude.js";

// Also load the repo-root .env so a single .env works for the whole project.
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, "..", "..", ".env") });

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasApiKey: !!process.env.NVIDIA_API_KEY });
});

app.use("/api/ai", aiRouter);
app.use("/api", dataRouter);

// Central error handler — maps the SDK's typed errors to sensible HTTP codes.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ClaudeRefusalError) {
    res.status(422).json({ error: err.message });
    return;
  }
  if (err instanceof OpenAI.AuthenticationError) {
    res.status(500).json({
      error: "NVIDIA API key missing or invalid. Set NVIDIA_API_KEY in the project-root .env and restart the server.",
    });
    return;
  }
  if (err instanceof OpenAI.RateLimitError) {
    res.status(429).json({ error: "Rate-limited by the NVIDIA API (free tier). Wait a minute and try again." });
    return;
  }
  if (err instanceof OpenAI.BadRequestError) {
    res.status(500).json({ error: `NVIDIA rejected the request: ${err.message}` });
    return;
  }
  if (err instanceof OpenAI.APIConnectionError) {
    // TEMP DEBUG: log the real underlying cause instead of swallowing it.
    console.error("NVIDIA connection error — underlying cause:", err.cause ?? err);
    const causeMsg = err.cause instanceof Error ? err.cause.message : String(err.cause ?? "no cause captured");
    res.status(502).json({ error: `Could not reach the NVIDIA API. Check your network connection. [debug: ${causeMsg}]` });
    return;
  }
  if (err instanceof OpenAI.APIError) {
    res.status(502).json({ error: `NVIDIA API error (${err.status}): ${err.message}` });
    return;
  }
  const message = err instanceof Error ? err.message : "Unknown server error";
  console.error(err);
  res.status(500).json({ error: message });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`LaunchKit API listening on http://localhost:${port}`);
  if (!process.env.NVIDIA_API_KEY) {
    console.warn(
      "⚠  NVIDIA_API_KEY is not set — AI endpoints will fail until you create a .env (see .env.example)."
    );
  }
});
