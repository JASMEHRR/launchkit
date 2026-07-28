// JSON schemas for structured outputs. Every object sets
// additionalProperties:false and lists every property in `required`
// (both mandatory for output_config.format on this model).

export const matrixSchema = {
  type: "object",
  properties: {
    demand: {
      type: "integer",
      description: "Market demand score from 0 (nobody wants this) to 100 (urgent, widespread, funded demand).",
    },
    competition: {
      type: "integer",
      description: "Competition intensity score from 0 (almost nobody sells this) to 100 (saturated red ocean).",
    },
    quadrant: {
      type: "string",
      enum: ["blue_ocean", "red_ocean", "dead_zone", "too_niche"],
      description: "blue_ocean = high demand/low competition (target); red_ocean = high/high; dead_zone = low demand/high competition; too_niche = low/low.",
    },
    explanation: {
      type: "string",
      description: "3-5 sentences explaining both scores with concrete reasoning about who buys this and who already sells it.",
    },
    recommendation: {
      type: "string",
      description: "Direct advice: pursue as-is, reposition, or drop — and why.",
    },
    pivotSuggestion: {
      type: "string",
      description: "If not blue ocean: one concrete repositioning that would move it toward low competition / high demand. If already blue ocean: how to defend the position.",
    },
  },
  required: ["demand", "competition", "quadrant", "explanation", "recommendation", "pivotSuggestion"],
  additionalProperties: false,
} as const;

const pricingTier = {
  type: "object",
  properties: {
    name: { type: "string" },
    price: { type: "integer", description: "Monthly USD price. Charged by result, never by the hour." },
    deliverables: { type: "array", items: { type: "string" } },
    bestFor: { type: "string" },
  },
  required: ["name", "price", "deliverables", "bestFor"],
  additionalProperties: false,
} as const;

const competitor = {
  type: "object",
  properties: {
    name: { type: "string", description: "Competitor or competitor category." },
    description: { type: "string" },
    howToDifferentiate: { type: "string" },
  },
  required: ["name", "description", "howToDifferentiate"],
  additionalProperties: false,
} as const;

const planDay = {
  type: "object",
  properties: {
    day: { type: "integer" },
    title: { type: "string" },
    actions: { type: "array", items: { type: "string" } },
  },
  required: ["day", "title", "actions"],
  additionalProperties: false,
} as const;

export const offerSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "Short, punchy name for the offer." },
    whatYouSell: {
      type: "string",
      description: "The AI-powered service being sold, framed as a result the client gets — never hours.",
    },
    whoYouSellTo: {
      type: "string",
      description: "The ideal customer: specific role, company stage, and the pain that makes them buy now.",
    },
    pricingTiers: {
      type: "array",
      description: "Exactly 3 tiers, priced by result (e.g. 1500 / 3000 / 6000 per month).",
      items: pricingTier,
    },
    offerSummary: {
      type: "string",
      description: "A one-page offer summary the user could paste into a doc or DM. Plain prose, 150-250 words.",
    },
    whyBlueOcean: {
      type: "string",
      description: "Why this sits in the low-competition / high-demand quadrant of the Business Opportunity Matrix.",
    },
    competitors: {
      type: "array",
      description: "3-5 likely competitors or competitor categories with differentiation notes.",
      items: competitor,
    },
    sevenDayPlan: {
      type: "array",
      description: "A 7-day action plan to land the first high-paying client. Sell before you build.",
      items: planDay,
    },
  },
  required: [
    "title", "whatYouSell", "whoYouSellTo", "pricingTiers",
    "offerSummary", "whyBlueOcean", "competitors", "sevenDayPlan",
  ],
  additionalProperties: false,
} as const;

const prospect = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "A realistic archetype placeholder, e.g. 'Series-A SaaS founder (dev-tools)'. Do NOT fabricate a real person's identity.",
    },
    role: { type: "string" },
    companyType: { type: "string" },
    signal: {
      type: "string",
      description: "The observable buying signal, e.g. 'Posts on LinkedIn 4x/week but YouTube channel has 200 subs and no upload in 3 months'.",
    },
    whyLikely: {
      type: "string",
      description: "Why this profile has high response likelihood: wants the result, isn't good at it yet.",
    },
    openingAngle: {
      type: "string",
      description: "A suggested first-touch angle tailored to the signal.",
    },
    whereToFind: {
      type: "string",
      description: "Concretely where to find people matching this profile (search queries, communities, lists).",
    },
  },
  required: ["name", "role", "companyType", "signal", "whyLikely", "openingAngle", "whereToFind"],
  additionalProperties: false,
} as const;

export const prospectsSchema = {
  type: "object",
  properties: {
    prospects: {
      type: "array",
      description: "About 10 realistic prospect profiles that fit the offer's ideal customer.",
      items: prospect,
    },
    researchNotes: {
      type: "string",
      description: "2-3 sentences on what current web research revealed about where these buyers congregate right now.",
    },
  },
  required: ["prospects", "researchNotes"],
  additionalProperties: false,
} as const;

const replyBranch = {
  type: "object",
  properties: {
    ifTheySay: { type: "string" },
    respondWith: { type: "string" },
  },
  required: ["ifTheySay", "respondWith"],
  additionalProperties: false,
} as const;

const sequence = {
  type: "object",
  properties: {
    connectionMessage: {
      type: "string",
      description: "Short LinkedIn connection request note. No pitch. Under 300 characters.",
    },
    followUp: {
      type: "string",
      description: "First DM after connecting.",
    },
    loomScript: {
      type: "string",
      description: "A 60-90 second Loom video script: greeting, 2 genuine observations, 1 concrete missed opportunity, soft CTA.",
    },
    replyHandling: {
      type: "array",
      description: "3-4 common replies and how to respond to each.",
      items: replyBranch,
    },
    callBookingAsk: {
      type: "string",
      description: "The message that asks for the call. Low-pressure, specific time framing.",
    },
  },
  required: ["connectionMessage", "followUp", "loomScript", "replyHandling", "callBookingAsk"],
  additionalProperties: false,
} as const;

export const outreachSchema = {
  type: "object",
  properties: {
    outbound: {
      ...sequence,
      description: "Cold variant: agitate a specific pain, then offer a free audit.",
    },
    inbound: {
      ...sequence,
      description: "Warm variant: compliment something specific they did, then ask a this-or-that qualifying question.",
    },
  },
  required: ["outbound", "inbound"],
  additionalProperties: false,
} as const;
