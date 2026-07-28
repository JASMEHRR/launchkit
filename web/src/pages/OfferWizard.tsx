import { useState } from "react";
import { api } from "../api";
import type { Offer } from "../types";
import {
  Button, Card, Disclaimer, ErrorNote, FrameworkNote, PageHeader, Spinner, Field, inputCls,
} from "../components/ui";

const STEPS = [
  {
    key: "skills",
    title: "What are you good at?",
    hint: "Hard skills you could charge for today — marketing, sales, design, coding, video editing, copywriting, ops…",
    placeholder: "e.g. B2B marketing, running paid ads, writing landing pages",
  },
  {
    key: "knowledge",
    title: "What do you know deeply?",
    hint: "Industries, niches, or topics where you understand the players and the pains better than an outsider.",
    placeholder: "e.g. SaaS go-to-market, e-commerce logistics, fitness coaching industry",
  },
  {
    key: "experience",
    title: "What have you actually done?",
    hint: "Jobs, projects, wins — even small ones. Proof beats credentials.",
    placeholder: "e.g. 4 years in a startup marketing team, grew a newsletter to 3k subs",
  },
  {
    key: "interests",
    title: "What could you talk about for hours?",
    hint: "You'll be doing outreach and content daily — pick terrain you actually enjoy.",
    placeholder: "e.g. YouTube strategy, AI tools, personal finance",
  },
] as const;

type Answers = Record<(typeof STEPS)[number]["key"] | "notes", string>;

function OfferResult({ offer, onSaved }: { offer: Offer; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const created = await api.post<Offer>("/api/offers", offer);
      await api.post(`/api/offers/${created.id}/activate`);
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-xs font-bold uppercase tracking-widest text-clay">Your offer</p>
        <h2 className="mt-1 font-display text-2xl font-semibold">{offer.title}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">What you sell</p>
            <p className="mt-1 text-sm leading-relaxed">{offer.whatYouSell}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">Who you sell to</p>
            <p className="mt-1 text-sm leading-relaxed">{offer.whoYouSellTo}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {offer.pricingTiers.map((tier, i) => (
          <Card key={tier.name} className={i === 1 ? "border-clay ring-1 ring-clay/30" : ""}>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">{tier.name}</p>
            <p className="mt-1 font-display text-3xl font-semibold text-ink">
              ${tier.price.toLocaleString()}
              <span className="text-sm font-normal text-ink-soft">/mo</span>
            </p>
            <ul className="mt-3 space-y-1.5 text-sm leading-snug">
              {tier.deliverables.map((d) => (
                <li key={d} className="flex gap-2">
                  <span className="text-pine">✓</span>
                  {d}
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-line pt-2 text-xs italic text-ink-soft">Best for: {tier.bestFor}</p>
          </Card>
        ))}
      </div>
      <p className="text-xs italic text-ink-soft">
        Priced by result, never by the hour — the client buys an outcome, not your time.
      </p>

      <Card>
        <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">One-page summary</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{offer.offerSummary}</p>
      </Card>

      <Card>
        <p className="text-xs font-bold uppercase tracking-widest text-pine">Why this is a Blue Ocean</p>
        <p className="mt-2 text-sm leading-relaxed">{offer.whyBlueOcean}</p>
      </Card>

      <Card>
        <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">Likely competitors — and your edge</p>
        <div className="mt-3 space-y-4">
          {offer.competitors.map((c) => (
            <div key={c.name} className="border-l-2 border-clay/40 pl-4">
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="mt-0.5 text-sm text-ink-soft">{c.description}</p>
              <p className="mt-1 text-sm">
                <span className="font-semibold text-clay">Differentiate:</span> {c.howToDifferentiate}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">7-day plan to the first client</p>
        <div className="mt-3 space-y-3">
          {offer.sevenDayPlan.map((d) => (
            <div key={d.day} className="flex gap-4">
              <span className="font-display text-lg font-semibold text-clay">D{d.day}</span>
              <div>
                <p className="text-sm font-semibold">{d.title}</p>
                <ul className="mt-0.5 list-inside list-disc text-sm text-ink-soft">
                  {d.actions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Disclaimer>
        This output gets you ~70–80% of the way. Before you send a single DM: verify the competitors yourself
        (search them, check their pricing pages) and sanity-check the price points against what your market
        actually pays. The remaining 20–30% — judgment — is your job.
      </Disclaimer>

      {error && <ErrorNote message={error} />}
      <div className="flex items-center gap-4">
        <Button onClick={save} disabled={saving || saved}>
          {saved ? "Saved as active offer ✓" : saving ? "Saving…" : "Save as my active offer"}
        </Button>
        {saved && (
          <a href="/prospects" className="text-sm font-semibold text-clay hover:text-clay-deep">
            Next: build your prospect list →
          </a>
        )}
      </div>
    </div>
  );
}

export default function OfferWizard() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    skills: "", knowledge: "", experience: "", interests: "", notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [offer, setOffer] = useState<Offer | null>(null);

  const onReview = step === STEPS.length;

  async function generate() {
    setLoading(true);
    setError("");
    try {
      setOffer(await api.post<Offer>("/api/ai/offer", answers));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  if (offer) {
    return (
      <div className="max-w-4xl">
        <PageHeader kicker="Step 02 — The Offer Triangle" title="Your offer is ready" />
        <OfferResult offer={offer} onSaved={() => undefined} />
        <button className="mt-6 text-sm font-semibold text-ink-soft hover:text-ink" onClick={() => setOffer(null)}>
          ← Start over with different inputs
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        kicker="Step 02 — The Offer Triangle"
        title="AI Business Idea Generator"
        subtitle="Answer four questions. Claude combines your unfair advantages with what's trending in AI and builds the offer: what you sell, who you sell to, and result-based pricing."
      />

      <div className="mb-6">
        <FrameworkNote title="The Offer Triangle">
          Every offer has three corners: <strong>What</strong> you sell (an AI-powered service framed as a result),{" "}
          <strong>Who</strong> you sell to (one specific buyer with money and an urgent pain), and{" "}
          <strong>Pricing</strong> (charged by result — think $1.5K / $3K / $6K per month — never by the hour).
          And the golden rule: <strong>sell before you build</strong>. Land the first client conversation, then build.
        </FrameworkNote>
      </div>

      <div className="mb-6 flex items-center gap-2">
        {[...STEPS.map((s) => s.key), "review"].map((k, i) => (
          <button
            key={k}
            onClick={() => i <= step && setStep(i)}
            className={`h-2 flex-1 rounded-full transition-colors ${i <= step ? "bg-clay" : "bg-line"}`}
            aria-label={`Step ${i + 1}`}
          />
        ))}
      </div>

      {!onReview ? (
        <Card>
          <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">
            Question {step + 1} of {STEPS.length}
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold">{STEPS[step].title}</h2>
          <p className="mt-1 text-sm text-ink-soft">{STEPS[step].hint}</p>
          <textarea
            className={`${inputCls} mt-4 min-h-28 resize-y`}
            placeholder={STEPS[step].placeholder}
            value={answers[STEPS[step].key]}
            onChange={(e) => setAnswers({ ...answers, [STEPS[step].key]: e.target.value })}
            autoFocus
          />
          <div className="mt-4 flex justify-between">
            <Button variant="secondary" onClick={() => setStep(step - 1)} disabled={step === 0}>
              Back
            </Button>
            <Button onClick={() => setStep(step + 1)}>
              {step === STEPS.length - 1 ? "Review" : "Next"}
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <h2 className="font-display text-xl font-semibold">Review your inputs</h2>
          <div className="mt-4 space-y-3">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-start justify-between gap-4 border-b border-line pb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">{s.title}</p>
                  <p className="mt-0.5 text-sm">{answers[s.key] || <em className="text-ink-soft">— skipped —</em>}</p>
                </div>
                <button className="shrink-0 text-xs font-semibold text-clay" onClick={() => setStep(i)}>
                  Edit
                </button>
              </div>
            ))}
            <Field label="Anything else Claude should know?" hint="Optional — constraints, markets to avoid, time available…">
              <textarea
                className={`${inputCls} min-h-20 resize-y`}
                value={answers.notes}
                onChange={(e) => setAnswers({ ...answers, notes: e.target.value })}
              />
            </Field>
          </div>
          {error && <div className="mt-4"><ErrorNote message={error} /></div>}
          <div className="mt-5 flex items-center justify-between">
            <Button variant="secondary" onClick={() => setStep(step - 1)} disabled={loading}>
              Back
            </Button>
            <Button onClick={generate} disabled={loading}>
              {loading ? "Building your offer…" : "Generate my offer"}
            </Button>
          </div>
          {loading && (
            <div className="mt-4">
              <Spinner label="Claude is combining your skills with what's trending in AI — 30–90 seconds…" />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
