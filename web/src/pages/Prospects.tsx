import { useEffect, useState } from "react";
import { api } from "../api";
import type { GeneratedProspect, Offer, ProspectList } from "../types";
import {
  Button, Card, Disclaimer, ErrorNote, FrameworkNote, PageHeader, Spinner,
} from "../components/ui";

export default function Prospects() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerId, setOfferId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [list, setList] = useState<ProspectList | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<Offer[]>("/api/offers").then((rows) => {
      setOffers(rows);
      const active = rows.find((o) => o.isActive) ?? rows[0];
      if (active?.id) setOfferId(active.id);
    });
  }, []);

  async function generate() {
    if (!offerId) return;
    setLoading(true);
    setError("");
    setSaved(false);
    try {
      const result = await api.post<ProspectList>("/api/ai/prospects", { offerId });
      setList(result);
      setSelected(new Set(result.prospects.map((_, i) => i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveSelected() {
    if (!list || !offerId) return;
    const prospects: GeneratedProspect[] = list.prospects.filter((_, i) => selected.has(i));
    try {
      await api.post("/api/prospects", { offerId, prospects });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  function toggle(i: number) {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
    setSaved(false);
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        kicker="Step 03 — Build the list"
        title="Targeted List Builder"
        subtitle="Claude researches the market with live web search and produces ~10 prospect profiles that match your ideal customer — each with the buying signal that makes them likely to reply."
      />

      <div className="mb-6">
        <FrameworkNote title="Buying signals">
          The whole game is finding people who <strong>visibly want the result</strong> but{" "}
          <strong>visibly aren't good at it yet</strong>. Example: a SaaS founder posting on LinkedIn 4x a week whose
          YouTube channel has 200 subscribers — wants content, can't produce video. That gap is why they reply.
        </FrameworkNote>
      </div>

      <Card className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-soft">Offer</span>
            <select
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:border-clay focus:outline-none"
              value={offerId ?? ""}
              onChange={(e) => setOfferId(Number(e.target.value))}
            >
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title} {o.isActive ? "· active" : ""}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={generate} disabled={loading || !offerId} className="sm:mt-5">
            {loading ? "Researching…" : "Generate prospect list"}
          </Button>
        </div>
        {loading && (
          <div className="mt-4">
            <Spinner label="Claude is searching the web for where your buyers hang out right now — this can take 1–2 minutes…" />
          </div>
        )}
        {error && <div className="mt-4"><ErrorNote message={error} /></div>}
      </Card>

      {list && (
        <div className="space-y-4">
          <Card className="bg-pine-soft/60">
            <p className="text-xs font-bold uppercase tracking-widest text-pine">Research notes</p>
            <p className="mt-1 text-sm leading-relaxed">{list.researchNotes}</p>
          </Card>

          {list.prospects.map((p, i) => (
            <Card key={i} className={selected.has(i) ? "border-clay/50" : "opacity-60"}>
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggle(i)}
                  className="mt-1 h-4 w-4 accent-clay"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-ink-soft">{p.role} · {p.companyType}</p>
                  </div>
                  <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                    <p><span className="font-semibold text-clay">Signal:</span> {p.signal}</p>
                    <p><span className="font-semibold text-pine">Why they'll reply:</span> {p.whyLikely}</p>
                    <p><span className="font-semibold">Opening angle:</span> {p.openingAngle}</p>
                    <p><span className="font-semibold">Where to find them:</span> {p.whereToFind}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          <Disclaimer>
            These are researched <em>archetypes</em>, not verified contacts. Your job: open LinkedIn/communities,
            find 2–3 real people matching each profile, and confirm the signal actually holds before you reach out.
          </Disclaimer>

          <div className="flex items-center gap-4">
            <Button onClick={saveSelected} disabled={selected.size === 0 || saved}>
              {saved ? `Saved ${selected.size} to pipeline ✓` : `Save ${selected.size} to my pipeline`}
            </Button>
            {saved && (
              <a href="/outreach" className="text-sm font-semibold text-clay hover:text-clay-deep">
                Next: write the outreach →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
