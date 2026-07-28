import { useEffect, useState } from "react";
import { api } from "../api";
import type { OutreachPackage, PlanCell, SavedProspect, Sequence } from "../types";
import {
  Button, Card, CopyBlock, ErrorNote, FrameworkNote, PageHeader, Spinner, StatusPill,
} from "../components/ui";

function SequenceView({ seq }: { seq: Sequence }) {
  return (
    <div className="space-y-3">
      <CopyBlock label="1 · Connection message" text={seq.connectionMessage} />
      <CopyBlock label="2 · Follow-up DM" text={seq.followUp} />
      <CopyBlock label="3 · Loom video script" text={seq.loomScript} />
      <div className="rounded-xl border border-line bg-white p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-pine">4 · Reply handling</p>
        <div className="space-y-3">
          {seq.replyHandling.map((r, i) => (
            <div key={i} className="border-l-2 border-gold/60 pl-3 text-sm">
              <p className="italic text-ink-soft">If they say: “{r.ifTheySay}”</p>
              <p className="mt-1">{r.respondWith}</p>
            </div>
          ))}
        </div>
      </div>
      <CopyBlock label="5 · Call-booking ask" text={seq.callBookingAsk} />
    </div>
  );
}

function PlanTracker() {
  const [cells, setCells] = useState<PlanCell[]>([]);
  const TASKS = [
    { key: "posts" as const, label: "Post published", target: "5 posts/week" },
    { key: "connections" as const, label: "~40 connections sent", target: "200 connections/week" },
    { key: "dms" as const, label: "16–18 DMs sent", target: "~16–18 DMs/day" },
  ];

  useEffect(() => {
    api.get<PlanCell[]>("/api/plan").then(setCells);
  }, []);

  function isDone(day: number, task: string) {
    return cells.some((c) => c.day === day && c.task === task && c.done === 1);
  }

  async function toggleCell(day: number, task: "posts" | "connections" | "dms") {
    const done = !isDone(day, task);
    setCells((prev) =>
      prev.map((c) => (c.day === day && c.task === task ? { ...c, done: done ? 1 : 0 } : c))
    );
    await api.put("/api/plan", { day, task, done });
  }

  const doneCount = cells.filter((c) => c.done === 1).length;
  const pct = cells.length ? Math.round((doneCount / cells.length) * 100) : 0;

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-clay">The 30-day plan</p>
          <p className="mt-1 text-sm text-ink-soft">
            5 posts/week · 200 connections/week (~40 per workday) · ~16–18 DMs/day. Consistency beats brilliance.
          </p>
        </div>
        <p className="font-display text-2xl font-semibold">{pct}%</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-pine transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-y-1 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-ink-soft">
              <th className="pr-2 font-bold">Day</th>
              {TASKS.map((t) => (
                <th key={t.key} className="px-2 font-bold">
                  {t.label}
                  <span className="block font-normal normal-case tracking-normal">{t.target}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => (
              <tr key={day} className="rounded-lg">
                <td className="pr-2 font-display font-semibold text-ink-soft">{day}</td>
                {TASKS.map((t) => (
                  <td key={t.key} className="px-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-pine"
                      checked={isDone(day, t.key)}
                      onChange={() => toggleCell(day, t.key)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function Outreach() {
  const [prospects, setProspects] = useState<SavedProspect[]>([]);
  const [prospectId, setProspectId] = useState<number | null>(null);
  const [pkg, setPkg] = useState<OutreachPackage | null>(null);
  const [variant, setVariant] = useState<"outbound" | "inbound">("outbound");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<SavedProspect[]>("/api/prospects").then((rows) => {
      setProspects(rows);
      if (rows[0]) setProspectId(rows[0].id);
    });
  }, []);

  // Load a previously generated sequence when switching prospects.
  useEffect(() => {
    if (!prospectId) return;
    setPkg(null);
    api.get<OutreachPackage | null>(`/api/outreach/${prospectId}`).then(setPkg);
  }, [prospectId]);

  async function generate() {
    if (!prospectId) return;
    setLoading(true);
    setError("");
    try {
      setPkg(await api.post<OutreachPackage>("/api/ai/outreach", { prospectId }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  const current = prospects.find((p) => p.id === prospectId);

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        kicker="Step 04 — Start conversations"
        title="Outreach Sequencer"
        subtitle="Pick a prospect from your pipeline; Claude writes the full sequence — connection request → follow-up → Loom script → reply handling → call-booking ask — in cold and warm variants."
      />

      <FrameworkNote title="The two plays">
        <strong>Outbound (cold):</strong> agitate a pain they can see themselves ("your last upload was 3 months
        ago"), then offer a free audit. <strong>Inbound/warm:</strong> compliment something specific they made, then
        ask a this-or-that qualifying question. Both funnels end at the same place: a 20-minute call.
      </FrameworkNote>

      {prospects.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-soft">
            No prospects in your pipeline yet. Go to{" "}
            <a href="/prospects" className="font-semibold text-clay">List Builder</a> and save a few first.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex-1 text-sm">
                <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-soft">Prospect</span>
                <select
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:border-clay focus:outline-none"
                  value={prospectId ?? ""}
                  onChange={(e) => setProspectId(Number(e.target.value))}
                >
                  {prospects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.company_type}
                    </option>
                  ))}
                </select>
              </label>
              <Button onClick={generate} disabled={loading || !prospectId}>
                {loading ? "Writing…" : pkg ? "Regenerate sequence" : "Write my sequence"}
              </Button>
            </div>
            {current && (
              <p className="mt-3 text-sm text-ink-soft">
                <StatusPill status={current.status} />{" "}
                <span className="ml-2"><strong>Signal:</strong> {current.signal}</span>
              </p>
            )}
            {loading && (
              <div className="mt-4">
                <Spinner label="Claude is writing both variants against this prospect's buying signal (30–60s)…" />
              </div>
            )}
            {error && <div className="mt-4"><ErrorNote message={error} /></div>}
          </Card>

          {pkg && (
            <div>
              <div className="mb-4 inline-flex rounded-full border border-line bg-white p-1">
                {(["outbound", "inbound"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVariant(v)}
                    className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                      variant === v ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {v === "outbound" ? "Outbound · cold" : "Inbound · warm"}
                  </button>
                ))}
              </div>
              <SequenceView seq={pkg[variant]} />
            </div>
          )}
        </>
      )}

      <PlanTracker />
    </div>
  );
}
