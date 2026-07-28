import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(here, "..", "launchkit.db");

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    what_you_sell TEXT NOT NULL,
    who_you_sell_to TEXT NOT NULL,
    pricing_tiers TEXT NOT NULL,        -- JSON array
    offer_summary TEXT NOT NULL,
    why_blue_ocean TEXT NOT NULL,
    competitors TEXT NOT NULL,          -- JSON array
    seven_day_plan TEXT NOT NULL,       -- JSON array
    is_active INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS prospects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    offer_id INTEGER NOT NULL REFERENCES offers(id),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    company_type TEXT NOT NULL,
    signal TEXT NOT NULL,
    why_likely TEXT NOT NULL,
    opening_angle TEXT NOT NULL,
    where_to_find TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new', -- new | messaged | loom_sent | replied | call_booked
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS outreach_sequences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prospect_id INTEGER NOT NULL REFERENCES prospects(id),
    content TEXT NOT NULL,              -- JSON: { outbound: {...}, inbound: {...} }
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS matrix_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idea TEXT NOT NULL,
    demand INTEGER NOT NULL,
    competition INTEGER NOT NULL,
    quadrant TEXT NOT NULL,
    explanation TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    pivot_suggestion TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS plan_progress (
    day INTEGER NOT NULL,
    task TEXT NOT NULL,                 -- posts | connections | dms
    done INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, task)
  );
`);

// ---------------------------------------------------------------------------
// Seed: the masterclass example — a marketer helping VC-backed founders build
// a YouTube content machine, priced by result at $1.5K / $3K / $6K per month.
// ---------------------------------------------------------------------------
const offerCount = (db.prepare("SELECT COUNT(*) AS n FROM offers").get() as { n: number }).n;
if (offerCount === 0) {
  const pricingTiers = [
    {
      name: "Starter",
      price: 1500,
      deliverables: [
        "2 long-form YouTube videos per month (scripted, edited, thumbnailed)",
        "Channel setup + positioning strategy",
        "Monthly performance report",
      ],
      bestFor: "Founders testing YouTube as a channel for the first time",
    },
    {
      name: "Growth",
      price: 3000,
      deliverables: [
        "4 long-form videos per month, fully produced",
        "8 short-form clips repurposed for LinkedIn/Shorts",
        "Title + thumbnail A/B strategy",
        "Bi-weekly strategy call",
      ],
      bestFor: "Founders committed to content as a pipeline channel",
    },
    {
      name: "Content Machine",
      price: 6000,
      deliverables: [
        "Full done-for-you content engine: 4 long-form + 16 shorts per month",
        "Founder only shows up to record — everything else handled",
        "Lead-magnet + CTA funnel wired into every video",
        "Weekly strategy call and quarterly channel audit",
      ],
      bestFor: "VC-backed founders who want the channel to drive demos, not just views",
    },
  ];
  const competitors = [
    {
      name: "Generalist video editing agencies",
      description: "Charge per video or per hour, deliver edits but no strategy.",
      howToDifferentiate: "You sell the outcome (a working founder-led content machine that books calls), not editing hours. Price by result.",
    },
    {
      name: "Freelance editors on Upwork/Fiverr",
      description: "Cheap, but the founder still has to script, plan, and manage everything.",
      howToDifferentiate: "You remove the founder's time cost entirely — they record for 2 hours a month, you do the rest.",
    },
    {
      name: "Big content agencies",
      description: "$10K+/month retainers aimed at enterprise brands.",
      howToDifferentiate: "You're purpose-built for seed/Series-A founders: faster, cheaper, and personal-brand-first.",
    },
  ];
  const sevenDayPlan = [
    { day: 1, title: "Lock the offer", actions: ["Write the one-page offer doc", "Set up a clean LinkedIn profile that states who you help and the result you deliver"] },
    { day: 2, title: "Build the target list", actions: ["List 20 VC-backed founders active on LinkedIn but weak on YouTube", "Note the specific signal for each (posting cadence, subscriber count, last upload)"] },
    { day: 3, title: "Warm the pond", actions: ["Comment thoughtfully on 10 target founders' posts", "Send 40 connection requests with no pitch"] },
    { day: 4, title: "Start outreach", actions: ["DM the first 10 accepted connections using the outbound sequence", "Publish 1 post about a founder-content teardown"] },
    { day: 5, title: "Loom day", actions: ["Record 3 personalized Loom audits for the most engaged prospects", "Each Loom: 2 things they do well, 1 concrete missed opportunity, soft CTA"] },
    { day: 6, title: "Follow up", actions: ["Follow up with everyone who viewed but didn't reply", "Send 10 more DMs", "Publish 1 more post"] },
    { day: 7, title: "Book the call", actions: ["Push every warm reply to a 20-minute call", "On the call: diagnose, prescribe, quote the 3 tiers — sell the result, not hours"] },
  ];

  db.prepare(
    `INSERT INTO offers (title, what_you_sell, who_you_sell_to, pricing_tiers, offer_summary,
       why_blue_ocean, competitors, seven_day_plan, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
  ).run(
    "Founder-Led YouTube Content Machine",
    "A done-for-you YouTube content engine: strategy, scripting, editing, thumbnails, and repurposing — the founder only shows up to record. Sold as a monthly result (a working content channel that generates inbound pipeline), never by the hour.",
    "VC-backed startup founders (seed to Series B) who are active on LinkedIn but underperforming or absent on YouTube — they already believe in content, they just can't produce video at quality and cadence.",
    JSON.stringify(pricingTiers),
    "Most VC-backed founders know video content compounds, but producing it takes 15+ hours a week they don't have. This offer turns 2 hours of founder recording time per month into a full YouTube presence: strategy, scripts, edits, thumbnails, and short-form repurposing, all handled. Pricing is by result — a live, growing channel wired to book demos — at $1.5K, $3K, or $6K per month depending on volume and funnel depth. The pitch: you already won on LinkedIn; let's clone that win on the platform with 10x shelf life.",
    "High demand (founders are pouring effort into content and VCs push distribution), low direct competition (editors sell hours, agencies sell enterprise retainers — almost nobody sells a founder-first YouTube *result* at this price point). That's the low-competition / high-demand quadrant.",
    JSON.stringify(competitors),
    JSON.stringify(sevenDayPlan)
  );
}

// Seed the 30-day plan grid (3 tasks x 30 days), untouched days default to not-done.
const planCount = (db.prepare("SELECT COUNT(*) AS n FROM plan_progress").get() as { n: number }).n;
if (planCount === 0) {
  const insert = db.prepare("INSERT INTO plan_progress (day, task, done) VALUES (?, ?, 0)");
  const seedPlan = db.transaction(() => {
    for (let day = 1; day <= 30; day++) {
      for (const task of ["posts", "connections", "dms"]) insert.run(day, task);
    }
  });
  seedPlan();
}
