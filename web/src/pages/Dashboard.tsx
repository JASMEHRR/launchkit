import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { DashboardData, ProspectStatus } from "../types";
import { Card, PageHeader, Spinner, STATUS_META } from "../components/ui";

const FUNNEL_ORDER: ProspectStatus[] = ["new", "messaged", "loom_sent", "replied", "call_booked"];
const STATUSES: ProspectStatus[] = ["new", "messaged", "loom_sent", "replied", "call_booked"];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.get<DashboardData>("/api/dashboard").then(setData).catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  async function setStatus(id: number, status: ProspectStatus) {
    await api.patch(`/api/prospects/${id}`, { status });
    load();
  }

  if (error) return <p className="text-sm text-clay-deep">{error} — is the API server running on port 3001?</p>;
  if (!data) return <Spinner label="Loading your pipeline…" />;

  const { activeOffer, prospects, funnel, plan } = data;
  const total = prospects.length;

  return (
    <div className="max-w-5xl space-y-8">
      <PageHeader
        kicker="Command center"
        title="Dashboard"
        subtitle="Your offer, your pipeline, and the funnel — the only three numbers that matter until the first client pays."
      />

      {/* Active offer */}
      <Card className="border-clay/30 bg-gradient-to-br from-white/80 to-rust-soft/40">
        {activeOffer ? (
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-clay">Active offer</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">{activeOffer.title}</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">{activeOffer.whatYouSell}</p>
              <p className="mt-2 text-sm">
                <span className="font-semibold">Selling to:</span> {activeOffer.whoYouSellTo}
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              {activeOffer.pricingTiers.map((t) => (
                <div key={t.name} className="rounded-xl border border-line bg-white px-3 py-2 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">{t.name}</p>
                  <p className="font-display text-lg font-semibold">${(t.price / 1000).toFixed(t.price % 1000 ? 1 : 0)}K</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-soft">
            No active offer yet.{" "}
            <Link to="/offer" className="font-semibold text-clay">Generate one →</Link>
          </p>
        )}
      </Card>

      {/* Funnel */}
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-soft">Funnel</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {FUNNEL_ORDER.map((s, i) => (
            <Card key={s} className={s === "call_booked" ? "border-pine bg-pine-soft" : ""}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">
                {i + 1}. {STATUS_META[s].label}
              </p>
              <p className={`mt-1 font-display text-3xl font-semibold ${s === "call_booked" ? "text-pine" : ""}`}>
                {funnel[s] ?? 0}
              </p>
            </Card>
          ))}
        </div>
        <p className="mt-2 text-xs italic text-ink-soft">
          {total === 0
            ? "Empty pipeline — build your list to start filling it."
            : `${total} prospect${total === 1 ? "" : "s"} in pipeline · goal: move every row one column to the right each week.`}
        </p>
      </div>

      {/* 30-day plan summary */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">30-day plan</p>
            <p className="mt-1 text-sm text-ink-soft">
              {plan.done} of {plan.total} daily tasks checked off.
            </p>
          </div>
          <Link to="/outreach" className="text-sm font-semibold text-clay hover:text-clay-deep">
            Open tracker →
          </Link>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-pine transition-all"
            style={{ width: `${plan.total ? Math.round((plan.done / plan.total) * 100) : 0}%` }}
          />
        </div>
      </Card>

      {/* Prospect table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">Pipeline</p>
          <Link to="/prospects" className="text-sm font-semibold text-clay hover:text-clay-deep">
            + Add prospects
          </Link>
        </div>
        {prospects.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-soft">
              Nothing here yet. <Link to="/prospects" className="font-semibold text-clay">Generate a targeted list →</Link>
            </p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line bg-white/70">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-widest text-ink-soft">
                  <th className="px-4 py-3 font-bold">Prospect</th>
                  <th className="px-4 py-3 font-bold">Buying signal</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((p) => (
                  <tr key={p.id} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-ink-soft">{p.role} · {p.company_type}</p>
                    </td>
                    <td className="max-w-md px-4 py-3 align-top text-ink-soft">{p.signal}</td>
                    <td className="px-4 py-3 align-top">
                      <select
                        className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs font-semibold focus:border-clay focus:outline-none"
                        value={p.status}
                        onChange={(e) => setStatus(p.id, e.target.value as ProspectStatus)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_META[s].label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
