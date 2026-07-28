import { Router } from "express";
import { db } from "../db.js";

export const dataRouter = Router();

const OFFER_STATUSES = ["new", "messaged", "loom_sent", "replied", "call_booked"] as const;

interface OfferRow {
  id: number;
  title: string;
  what_you_sell: string;
  who_you_sell_to: string;
  pricing_tiers: string;
  offer_summary: string;
  why_blue_ocean: string;
  competitors: string;
  seven_day_plan: string;
  is_active: number;
  created_at: string;
}

function offerToJson(row: OfferRow) {
  return {
    id: row.id,
    title: row.title,
    whatYouSell: row.what_you_sell,
    whoYouSellTo: row.who_you_sell_to,
    pricingTiers: JSON.parse(row.pricing_tiers),
    offerSummary: row.offer_summary,
    whyBlueOcean: row.why_blue_ocean,
    competitors: JSON.parse(row.competitors),
    sevenDayPlan: JSON.parse(row.seven_day_plan),
    isActive: !!row.is_active,
    createdAt: row.created_at,
  };
}

// ------------------------------- Offers ------------------------------------
dataRouter.get("/offers", (_req, res) => {
  const rows = db.prepare("SELECT * FROM offers ORDER BY created_at DESC").all() as OfferRow[];
  res.json(rows.map(offerToJson));
});

dataRouter.get("/offers/active", (_req, res) => {
  const row = db.prepare("SELECT * FROM offers WHERE is_active = 1 LIMIT 1").get() as OfferRow | undefined;
  res.json(row ? offerToJson(row) : null);
});

dataRouter.post("/offers", (req, res) => {
  const o = req.body ?? {};
  if (!o.title || !o.whatYouSell || !o.whoYouSellTo) {
    res.status(400).json({ error: "Offer is missing required fields." });
    return;
  }
  const info = db
    .prepare(
      `INSERT INTO offers (title, what_you_sell, who_you_sell_to, pricing_tiers, offer_summary,
         why_blue_ocean, competitors, seven_day_plan, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
    )
    .run(
      o.title,
      o.whatYouSell,
      o.whoYouSellTo,
      JSON.stringify(o.pricingTiers ?? []),
      o.offerSummary ?? "",
      o.whyBlueOcean ?? "",
      JSON.stringify(o.competitors ?? []),
      JSON.stringify(o.sevenDayPlan ?? [])
    );
  const row = db.prepare("SELECT * FROM offers WHERE id = ?").get(info.lastInsertRowid) as OfferRow;
  res.status(201).json(offerToJson(row));
});

dataRouter.post("/offers/:id/activate", (req, res) => {
  const id = Number(req.params.id);
  const exists = db.prepare("SELECT id FROM offers WHERE id = ?").get(id);
  if (!exists) {
    res.status(404).json({ error: "Offer not found." });
    return;
  }
  const activate = db.transaction(() => {
    db.prepare("UPDATE offers SET is_active = 0").run();
    db.prepare("UPDATE offers SET is_active = 1 WHERE id = ?").run(id);
  });
  activate();
  res.json({ ok: true });
});

// ------------------------------ Prospects ----------------------------------
dataRouter.get("/prospects", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, o.title AS offer_title FROM prospects p
       JOIN offers o ON o.id = p.offer_id ORDER BY p.created_at DESC, p.id DESC`
    )
    .all();
  res.json(rows);
});

// Bulk-save prospects picked from a generated list.
dataRouter.post("/prospects", (req, res) => {
  const { offerId, prospects } = req.body ?? {};
  if (!Number(offerId) || !Array.isArray(prospects) || prospects.length === 0) {
    res.status(400).json({ error: "Provide offerId and a non-empty prospects array." });
    return;
  }
  const insert = db.prepare(
    `INSERT INTO prospects (offer_id, name, role, company_type, signal, why_likely, opening_angle, where_to_find)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const saveAll = db.transaction(() => {
    for (const p of prospects) {
      insert.run(
        Number(offerId),
        p.name ?? "Unnamed prospect",
        p.role ?? "",
        p.companyType ?? "",
        p.signal ?? "",
        p.whyLikely ?? "",
        p.openingAngle ?? "",
        p.whereToFind ?? ""
      );
    }
  });
  saveAll();
  res.status(201).json({ saved: prospects.length });
});

dataRouter.patch("/prospects/:id", (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status ?? "");
  if (!OFFER_STATUSES.includes(status as (typeof OFFER_STATUSES)[number])) {
    res.status(400).json({ error: `status must be one of: ${OFFER_STATUSES.join(", ")}` });
    return;
  }
  const info = db.prepare("UPDATE prospects SET status = ? WHERE id = ?").run(status, id);
  if (info.changes === 0) {
    res.status(404).json({ error: "Prospect not found." });
    return;
  }
  res.json({ ok: true });
});

dataRouter.delete("/prospects/:id", (req, res) => {
  const id = Number(req.params.id);
  db.prepare("DELETE FROM outreach_sequences WHERE prospect_id = ?").run(id);
  db.prepare("DELETE FROM prospects WHERE id = ?").run(id);
  res.json({ ok: true });
});

// ------------------------------ Outreach -----------------------------------
dataRouter.get("/outreach/:prospectId", (req, res) => {
  const row = db
    .prepare(
      "SELECT content FROM outreach_sequences WHERE prospect_id = ? ORDER BY created_at DESC, id DESC LIMIT 1"
    )
    .get(Number(req.params.prospectId)) as { content: string } | undefined;
  res.json(row ? JSON.parse(row.content) : null);
});

// ----------------------------- 30-day plan ---------------------------------
dataRouter.get("/plan", (_req, res) => {
  const rows = db.prepare("SELECT day, task, done FROM plan_progress ORDER BY day, task").all();
  res.json(rows);
});

dataRouter.put("/plan", (req, res) => {
  const { day, task, done } = req.body ?? {};
  if (!Number(day) || !["posts", "connections", "dms"].includes(task)) {
    res.status(400).json({ error: "Provide day (1-30) and task (posts|connections|dms)." });
    return;
  }
  db.prepare(
    `INSERT INTO plan_progress (day, task, done) VALUES (?, ?, ?)
     ON CONFLICT(day, task) DO UPDATE SET done = excluded.done`
  ).run(Number(day), task, done ? 1 : 0);
  res.json({ ok: true });
});

// ------------------------------ Dashboard ----------------------------------
dataRouter.get("/dashboard", (_req, res) => {
  const active = db.prepare("SELECT * FROM offers WHERE is_active = 1 LIMIT 1").get() as OfferRow | undefined;
  const prospects = db
    .prepare(
      `SELECT p.*, o.title AS offer_title FROM prospects p
       JOIN offers o ON o.id = p.offer_id ORDER BY p.created_at DESC, p.id DESC`
    )
    .all() as Array<{ status: string }>;

  const funnel = { new: 0, messaged: 0, loom_sent: 0, replied: 0, call_booked: 0 } as Record<string, number>;
  for (const p of prospects) funnel[p.status] = (funnel[p.status] ?? 0) + 1;

  const planDone = (db.prepare("SELECT COUNT(*) AS n FROM plan_progress WHERE done = 1").get() as { n: number }).n;

  res.json({
    activeOffer: active ? offerToJson(active) : null,
    prospects,
    funnel,
    plan: { done: planDone, total: 90 },
  });
});
