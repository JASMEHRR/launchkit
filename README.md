# 🚀 LaunchKit

An interactive tool that operationalizes the one-person-AI-business methodology from Patrick Dang's
masterclass *"How I'd Start a $10K/Month One-Person Business With Claude."* It walks you from
**no idea → first high-paying client**, following the core principle: **sell before you build.**

| Step | Screen | What it does |
|---|---|---|
| 01 | **Opportunity Matrix** | Scores any idea on demand × competition and places it on the 2×2 grid (Blue Ocean / Red Ocean / Dead Zone / Too Niche) with an explanation and pivot advice |
| 02 | **Offer Generator** | Guided wizard (skills → knowledge → experience → interests) → full offer: what/who/3 result-based pricing tiers, one-page summary, why it's Blue Ocean, competitors + differentiation, 7-day first-client plan |
| 03 | **List Builder** | Uses Claude **with live web search** to produce ~10 prospect profiles with the buying signal, response-likelihood reasoning, opening angle, and where to find them |
| 04 | **Outreach** | Full sequences per prospect (connection → follow-up → Loom script → reply handling → call ask) in **outbound (cold)** and **inbound (warm)** variants, plus the 30-day plan tracker (5 posts/wk · 200 connections/wk · ~16–18 DMs/day) |
| — | **Dashboard** | Active offer, pipeline table with per-prospect status, funnel counters, plan progress |

## Setup

Requires **Node 20+** (tested on Node 24).

```bash
# 1. Install everything (root + server + web)
npm run install:all

# 2. Configure your API key (server-side only — never shipped to the browser)
copy .env.example .env        # macOS/Linux: cp .env.example .env
# then edit .env and set ANTHROPIC_API_KEY=sk-ant-...

# 3. Run both servers with one command
npm run dev
```

- Frontend: **http://localhost:5173** (Vite dev server, proxies `/api` to the backend)
- Backend: **http://localhost:3001** (Express + SQLite + Anthropic SDK)

Or run them in two terminals: `npm run dev --prefix server` and `npm run dev --prefix web`.

The app is seeded with the masterclass example offer — *a marketer helping VC-backed founders build a
YouTube content machine, priced $1.5K / $3K / $6K per month* — so every screen works on first load.
Sanity check: `http://localhost:3001/api/health` returns `{"ok":true,"hasApiKey":true}` when the key is set.

## Folder structure

```
launchkit/
├── .env.example          # copy to .env, add ANTHROPIC_API_KEY
├── package.json          # root: `npm run dev` runs server + web together
├── server/               # Express + TypeScript API (holds the Anthropic key)
│   └── src/
│       ├── index.ts      # app wiring + typed Anthropic error → HTTP mapping
│       ├── claude.ts     # Anthropic client + structuredGenerate() helper
│       ├── schemas.ts    # JSON schemas for structured outputs
│       ├── db.ts         # better-sqlite3 setup + seed data
│       └── routes/
│           ├── ai.ts     # /api/ai/* — matrix, offer, prospects, outreach
│           └── data.ts   # /api/*  — offers, prospects, plan, dashboard CRUD
└── web/                  # React + Vite + TypeScript + Tailwind v4
    └── src/
        ├── App.tsx       # router + sidebar layout
        ├── api.ts        # thin fetch wrapper (talks only to /api, never Anthropic)
        ├── types.ts      # shared response types
        ├── components/ui.tsx
        └── pages/        # Dashboard, Matrix, OfferWizard, Prospects, Outreach
```

## How the Claude integration works

- Official Node SDK (`@anthropic-ai/sdk`), constructed with a bare `new Anthropic()` reading
  `process.env.ANTHROPIC_API_KEY`. **The key never reaches frontend code** — the browser only calls
  the Express endpoints.
- Model: `claude-opus-4-8` for all generation features.
- Thinking: `thinking: { type: "adaptive" }`. No `budget_tokens`, no `temperature`/`top_p`/`top_k`
  (all removed on this model and return 400s).
- Every AI call **streams** and resolves via `.finalMessage()` (these calls can run 1–2 minutes with
  web search), with generous `max_tokens` (16K–64K depending on the endpoint).
- Structured data uses **structured outputs**: `output_config: { format: { type: "json_schema", schema } }`
  with `additionalProperties: false` and full `required` arrays — no assistant-message prefilling
  (that 400s on this model).
- The List Builder enables the server-side web search tool:
  `tools: [{ type: "web_search_20260209", name: "web_search" }]`, and handles `stop_reason: "pause_turn"`
  by resuming the turn.
- `stop_reason` is checked (including `"refusal"` → HTTP 422) before content is read, and the SDK's
  typed errors (`Anthropic.RateLimitError`, `Anthropic.AuthenticationError`, `Anthropic.APIError`, …)
  are mapped to meaningful HTTP responses in one central error handler.

## Persistence

Single-file SQLite (`server/launchkit.db`, auto-created) via `better-sqlite3`: offers, prospects +
outreach status, generated outreach sequences, matrix score history, and the 30-day plan grid.
Delete the `.db` file to reset to the seeded state.

## Notes & deliberate v1 decisions

- **Single-user, no auth.** If you deploy this beyond localhost, add auth as Express middleware in
  `server/src/index.ts` (e.g. a session/JWT check in front of `/api`) and a `user_id` column on each
  table. Everything else already flows through that one chokepoint.
- **AI output is 70–80%, not 100%.** The UI says this where it matters: verify competitors and price
  points yourself, and treat generated prospects as researched archetypes — find the real humans that
  match them before reaching out.
- Prospect "names" are archetype labels by design — the model is instructed not to fabricate real
  people's identities.
- Matrix scores are persisted (`matrix_scores`) for future history views, though v1 doesn't render them.
