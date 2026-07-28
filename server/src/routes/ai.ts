import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "../db.js";
import { structuredGenerate } from "../claude.js";
import { matrixSchema, offerSchema, prospectsSchema, outreachSchema } from "../schemas.js";

export const aiRouter = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

// ---------------------------------------------------------------------------
// Business Opportunity Matrix: score an idea on demand + competition
// ---------------------------------------------------------------------------
interface MatrixResult {
  demand: number;
  competition: number;
  quadrant: string;
  explanation: string;
  recommendation: string;
  pivotSuggestion: string;
}

aiRouter.post(
  "/matrix",
  wrap(async (req, res) => {
    const idea = String(req.body?.idea ?? "").trim();
    if (!idea) {
      res.status(400).json({ error: "Provide an idea to score." });
      return;
    }

    const result = await structuredGenerate<MatrixResult>({
      system: `You score business ideas on the Business Opportunity Matrix from Patrick Dang's one-person-AI-business methodology.

The matrix: x-axis is competition (low to high), y-axis is demand (low to high).
- Blue Ocean (low competition, high demand): the target. People urgently want it and few sell it.
- Red Ocean (high competition, high demand): real money but you'll bleed fighting incumbents.
- Dead Zone (high competition, low demand): worst spot — crowded AND nobody's buying.
- Too Niche (low competition, low demand): easy to enter but no market to feed you.

Score honestly and calibrate against the real market: "AI resume writing" is red ocean; "AI-powered YouTube content machine for VC-backed founders" is blue ocean. Judge the idea AS POSITIONED — a generic idea aimed at a specific underserved buyer can move quadrants. Quadrant boundaries: demand >= 55 is "high demand", competition <= 45 is "low competition". Keep your scores consistent with the quadrant you assign.`,
      prompt: `Score this business idea on the matrix:\n\n"${idea}"`,
      schema: matrixSchema,
      maxTokens: 16000,
    });

    db.prepare(
      `INSERT INTO matrix_scores (idea, demand, competition, quadrant, explanation, recommendation, pivot_suggestion)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(idea, result.demand, result.competition, result.quadrant, result.explanation, result.recommendation, result.pivotSuggestion);

    res.json(result);
  })
);

// ---------------------------------------------------------------------------
// Offer Triangle generator: skills + market -> what / who / pricing
// ---------------------------------------------------------------------------
aiRouter.post(
  "/offer",
  wrap(async (req, res) => {
    const { skills, knowledge, experience, interests, notes } = req.body ?? {};
    if (!skills && !knowledge && !experience && !interests) {
      res.status(400).json({ error: "Fill in at least one of the wizard fields first." });
      return;
    }

    const result = await structuredGenerate<Record<string, unknown>>({
      system: `You are the "AI Business Idea Generator" from Patrick Dang's one-person-AI-business masterclass. You build offers using the Offer Triangle:

1. WHAT you sell — an AI-powered service, framed as a result/outcome, never hours.
2. WHO you sell to — one specific ideal customer with money and an urgent pain.
3. PRICING — charged by result, 3 tiers (anchor around 1.5K / 3K / 6K per month; adjust to the market but never race to the bottom).

Rules of the methodology:
- Sell before you build. The 7-day plan must land a first client conversation before any tooling gets built.
- Combine the person's existing skills/experience with what's currently trending in AI so they have an unfair advantage on day one.
- The offer must sit in the Blue Ocean quadrant: high demand, low competition. Position narrowly enough to escape red oceans.
- Competitor list must be honest — the user is told to sanity-check it themselves (AI gets them 70-80% of the way).
- Everything must be executable by ONE person using AI leverage. No hiring, no funding.`,
      prompt: `Build me an offer from these inputs:

Skills: ${skills || "(not given)"}
Knowledge: ${knowledge || "(not given)"}
Experience: ${experience || "(not given)"}
Interests: ${interests || "(not given)"}
Extra notes: ${notes || "(none)"}

Produce the complete offer package: the offer triangle, 3 pricing tiers, a one-page summary, why it's blue ocean, competitors + differentiation, and a 7-day plan to land the first high-paying client.`,
      schema: offerSchema,
      maxTokens: 32000,
    });

    res.json(result);
  })
);

// ---------------------------------------------------------------------------
// Targeted List Builder: web-search-backed prospect profiles for an offer
// ---------------------------------------------------------------------------
aiRouter.post(
  "/prospects",
  wrap(async (req, res) => {
    const offerId = Number(req.body?.offerId);
    const offer = db.prepare("SELECT * FROM offers WHERE id = ?").get(offerId) as
      | Record<string, string>
      | undefined;
    if (!offer) {
      res.status(404).json({ error: "Offer not found. Save an offer first." });
      return;
    }

    const result = await structuredGenerate<Record<string, unknown>>({
      system: `You are a targeted-list builder for a one-person AI business. Given an offer, you produce ~10 realistic prospect PROFILES (archetypes, not real named individuals) matching the ideal customer.

The core heuristic — buying signals: look for people who visibly WANT the result but visibly AREN'T good at it yet. Example: a SaaS founder active on LinkedIn but underperforming on YouTube = wants content, can't produce video = high response likelihood.

Use web search to ground the profiles in what's actually happening right now: where these buyers congregate, what they complain about, which communities/lists/search queries surface them. Do NOT invent real people's names — every "name" is an archetype label.`,
      prompt: `Build a targeted prospect list for this offer:

OFFER: ${offer.title}
WHAT: ${offer.what_you_sell}
WHO (ideal customer): ${offer.who_you_sell_to}

Research where these buyers are right now, then return ~10 prospect profiles with: the buying signal to look for, why response likelihood is high, a suggested opening angle, and concretely where to find them.`,
      schema: prospectsSchema,
      useWebSearch: true,
      maxTokens: 64000,
    });

    res.json(result);
  })
);

// ---------------------------------------------------------------------------
// Outreach sequencer: outbound + inbound sequences for a saved prospect
// ---------------------------------------------------------------------------
aiRouter.post(
  "/outreach",
  wrap(async (req, res) => {
    const prospectId = Number(req.body?.prospectId);
    const prospect = db
      .prepare(
        `SELECT p.*, o.title AS offer_title, o.what_you_sell, o.who_you_sell_to, o.pricing_tiers
         FROM prospects p JOIN offers o ON o.id = p.offer_id WHERE p.id = ?`
      )
      .get(prospectId) as Record<string, string> | undefined;
    if (!prospect) {
      res.status(404).json({ error: "Prospect not found. Save prospects to your pipeline first." });
      return;
    }

    const result = await structuredGenerate<Record<string, unknown>>({
      system: `You write LinkedIn/cold outreach sequences for a one-person AI business, following Patrick Dang's playbook.

Each sequence has 5 steps: connection message -> follow-up DM -> Loom video script -> reply handling -> call-booking ask.

Two variants:
- OUTBOUND (cold): agitate a specific, observable pain, then offer a FREE AUDIT (e.g. a Loom breakdown of their channel/funnel). Never pitch price in the first messages.
- INBOUND/WARM (they engaged with your content or accepted quickly): open by complimenting something SPECIFIC they did, then ask a this-or-that qualifying question (e.g. "are you focused more on inbound demos or founder brand right now?").

Tone rules: human, short sentences, zero corporate fluff, no emojis-spam, no "I hope this finds you well". Reference the prospect's actual buying signal. The goal of every sequence is a 20-minute call, not a sale in DMs.`,
      prompt: `Write both outreach variants (outbound + inbound) for this prospect and offer:

PROSPECT: ${prospect.name} — ${prospect.role} at ${prospect.company_type}
BUYING SIGNAL: ${prospect.signal}
OPENING ANGLE: ${prospect.opening_angle}

OFFER: ${prospect.offer_title}
WHAT WE SELL: ${prospect.what_you_sell}
WHO IT'S FOR: ${prospect.who_you_sell_to}`,
      schema: outreachSchema,
      maxTokens: 32000,
    });

    db.prepare("INSERT INTO outreach_sequences (prospect_id, content) VALUES (?, ?)").run(
      prospectId,
      JSON.stringify(result)
    );

    res.json(result);
  })
);
