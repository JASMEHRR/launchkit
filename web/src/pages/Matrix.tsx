import { useState } from "react";
import { api } from "../api";
import type { MatrixResult, Quadrant } from "../types";
import { Button, Card, ErrorNote, FrameworkNote, PageHeader, Spinner, inputCls } from "../components/ui";

const QUADRANT_META: Record<Quadrant, { label: string; color: string; verdict: string }> = {
  blue_ocean: { label: "Blue Ocean", color: "text-pine", verdict: "The target. High demand, few sellers — go." },
  red_ocean: { label: "Red Ocean", color: "text-clay-deep", verdict: "Real money, brutal fight. Reposition to escape." },
  dead_zone: { label: "Dead Zone", color: "text-ink-soft", verdict: "Crowded and nobody's buying. Walk away." },
  too_niche: { label: "Too Niche", color: "text-gold", verdict: "Easy to enter, no market to feed you." },
};

function Grid({ result }: { result: MatrixResult | null }) {
  // x = competition (0 left → 100 right), y = demand (0 bottom → 100 top)
  const x = result ? Math.min(Math.max(result.competition, 0), 100) : null;
  const y = result ? Math.min(Math.max(result.demand, 0), 100) : null;
  const cell = "flex items-start justify-between p-3";
  return (
    <div className="relative">
      <div className="grid aspect-square grid-cols-2 grid-rows-2 overflow-hidden rounded-2xl border border-line">
        <div className={`${cell} bg-pine-soft`}>
          <span className="text-xs font-bold uppercase tracking-widest text-pine">Blue Ocean 🎯</span>
        </div>
        <div className={`${cell} bg-rust-soft`}>
          <span className="text-xs font-bold uppercase tracking-widest text-clay-deep">Red Ocean</span>
        </div>
        <div className={`${cell} items-end bg-gold-soft`}>
          <span className="text-xs font-bold uppercase tracking-widest text-gold">Too Niche</span>
        </div>
        <div className={`${cell} items-end bg-slate-soft`}>
          <span className="text-xs font-bold uppercase tracking-widest text-ink-soft">Dead Zone</span>
        </div>
      </div>
      {x !== null && y !== null && (
        <div
          className="absolute z-10 -translate-x-1/2 translate-y-1/2 transition-all duration-700"
          style={{ left: `${x}%`, bottom: `${y}%` }}
        >
          <span className="block h-5 w-5 rounded-full border-[3px] border-paper bg-ink shadow-lg" />
        </div>
      )}
      <p className="mt-2 flex justify-between text-xs text-ink-soft">
        <span>← Low competition</span>
        <span>High competition →</span>
      </p>
      <p className="pointer-events-none absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-ink-soft">
        Demand →
      </p>
    </div>
  );
}

export default function Matrix() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<MatrixResult | null>(null);

  async function score() {
    setLoading(true);
    setError("");
    try {
      setResult(await api.post<MatrixResult>("/api/ai/matrix", { idea }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scoring failed");
    } finally {
      setLoading(false);
    }
  }

  const meta = result ? QUADRANT_META[result.quadrant] : null;

  return (
    <div className="max-w-4xl">
      <PageHeader
        kicker="Step 01 — Validate the idea"
        title="Business Opportunity Matrix"
        subtitle="Before selling anything, place the idea on the demand × competition grid. You're hunting for one quadrant only: Blue Ocean."
      />

      <div className="mb-6">
        <FrameworkNote title="The framework">
          Every business idea lives on two axes: <strong>demand</strong> (do people urgently want this?) and{" "}
          <strong>competition</strong> (how many people already sell it?). High demand + low competition ={" "}
          <strong>Blue Ocean</strong> — the only quadrant worth entering as a one-person business. Most "obvious" AI
          ideas are Red Ocean; the fix is usually narrowing <em>who</em> you serve, not changing <em>what</em> you do.
        </FrameworkNote>
      </div>

      <Card className="mb-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className={inputCls}
            placeholder='e.g. "AI-written LinkedIn ghostwriting for fintech founders"'
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && idea.trim() && !loading && score()}
          />
          <Button onClick={score} disabled={loading || !idea.trim()} className="shrink-0">
            {loading ? "Scoring…" : "Score my idea"}
          </Button>
        </div>
        {loading && (
          <div className="mt-4">
            <Spinner label="Claude is sizing the market and the competition (10–30s)…" />
          </div>
        )}
        {error && <div className="mt-4"><ErrorNote message={error} /></div>}
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <Grid result={result} />
        <div className="space-y-4">
          {!result && !loading && (
            <p className="text-sm italic text-ink-soft">
              Enter an idea to see where it lands. The dot's position is Claude's demand/competition score.
            </p>
          )}
          {result && meta && (
            <>
              <Card>
                <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">Verdict</p>
                <p className={`mt-1 font-display text-2xl font-semibold ${meta.color}`}>{meta.label}</p>
                <p className="mt-1 text-sm text-ink-soft">{meta.verdict}</p>
                <div className="mt-4 flex gap-6 text-sm">
                  <span>
                    Demand <strong className="font-display text-lg">{result.demand}</strong>/100
                  </span>
                  <span>
                    Competition <strong className="font-display text-lg">{result.competition}</strong>/100
                  </span>
                </div>
              </Card>
              <Card>
                <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">Why</p>
                <p className="mt-2 text-sm leading-relaxed">{result.explanation}</p>
              </Card>
              <Card>
                <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">Recommendation</p>
                <p className="mt-2 text-sm leading-relaxed">{result.recommendation}</p>
                <p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed">
                  <strong className="text-clay">{result.quadrant === "blue_ocean" ? "Defend it: " : "Pivot idea: "}</strong>
                  {result.pivotSuggestion}
                </p>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
