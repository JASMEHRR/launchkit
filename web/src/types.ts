export interface PricingTier {
  name: string;
  price: number;
  deliverables: string[];
  bestFor: string;
}

export interface Competitor {
  name: string;
  description: string;
  howToDifferentiate: string;
}

export interface PlanDay {
  day: number;
  title: string;
  actions: string[];
}

export interface Offer {
  id?: number;
  title: string;
  whatYouSell: string;
  whoYouSellTo: string;
  pricingTiers: PricingTier[];
  offerSummary: string;
  whyBlueOcean: string;
  competitors: Competitor[];
  sevenDayPlan: PlanDay[];
  isActive?: boolean;
  createdAt?: string;
}

export type Quadrant = "blue_ocean" | "red_ocean" | "dead_zone" | "too_niche";

export interface MatrixResult {
  demand: number;
  competition: number;
  quadrant: Quadrant;
  explanation: string;
  recommendation: string;
  pivotSuggestion: string;
}

export interface GeneratedProspect {
  name: string;
  role: string;
  companyType: string;
  signal: string;
  whyLikely: string;
  openingAngle: string;
  whereToFind: string;
}

export interface ProspectList {
  prospects: GeneratedProspect[];
  researchNotes: string;
}

export type ProspectStatus = "new" | "messaged" | "loom_sent" | "replied" | "call_booked";

export interface SavedProspect {
  id: number;
  offer_id: number;
  offer_title: string;
  name: string;
  role: string;
  company_type: string;
  signal: string;
  why_likely: string;
  opening_angle: string;
  where_to_find: string;
  status: ProspectStatus;
  created_at: string;
}

export interface ReplyBranch {
  ifTheySay: string;
  respondWith: string;
}

export interface Sequence {
  connectionMessage: string;
  followUp: string;
  loomScript: string;
  replyHandling: ReplyBranch[];
  callBookingAsk: string;
}

export interface OutreachPackage {
  outbound: Sequence;
  inbound: Sequence;
}

export interface PlanCell {
  day: number;
  task: "posts" | "connections" | "dms";
  done: number;
}

export interface DashboardData {
  activeOffer: Offer | null;
  prospects: SavedProspect[];
  funnel: Record<ProspectStatus, number>;
  plan: { done: number; total: number };
}
