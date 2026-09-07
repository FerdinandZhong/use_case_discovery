# Handoff — AI Use Case Discovery Tool

_Last updated: 2026-09-06_

## 1. What this is
A two-stage tool supporting the Cloudera **AI Use Case Discovery Workshop** (`docs/AI Discovery Workshop.pdf`):

- **Stage 1 — Pre-discovery survey.** A shareable web form that operationalizes the deck's
  "homework": customers fill it before the session; answers export into per-customer catalogs.
- **Stage 2 — On-site workshop cockpit.** A facilitator-driven, projected app that turns the
  collected (or live-captured) inputs into the deck's live artifacts — data dashboard,
  Value×Feasibility matrix, AI Canvas, and Roadmap/RACI — backed by a Node-native multi-agent pass.

**Governing premise (from field feedback): room-first, survey-optional.** Customers usually don't
return the survey and open up in the room, so the session/deck is the primary asset and the survey is
an accelerant.

## 2. Status at a glance
Everything below is **built, builds clean, and runs in Docker**. Two gaps remain (Section 8):
real-LLM agent output (needs a reachable endpoint) and full per-slide PPTX visual QA (needs LibreOffice).
Governance sign-off is still the blocker before real customer data.

**Running now:** container `ucd_test` on **http://localhost:8080**, `ADMIN_TOKEN=test-admin-secret`.
A seeded demo customer exists: **`/workshop/marigold-ab9f665a`** (open-source LLM pull example, fully
populated). Slugs get a random suffix, so create fresh ones via `/admin` as needed.

## 3. Key decisions
| Topic | Decision |
|---|---|
| Respondents | External customers (Stage 1); facilitator-only, projected single screen (Stage 2) |
| Stack | Next.js 14 App Router + TypeScript + Tailwind + recharts |
| Hosting | **Docker image**, runnable as a container OR a Cloudera AI (CML) Workbench Application. Not Vercel/Neon (governance). |
| Datastore | Swappable, env-selected: **SQLite default** (data stays in container/project), **Postgres** when `DATABASE_URL` set |
| Agents | **Node-native** (typed functions → OpenAI-compatible endpoint). No Python, no framework. CAI Agent Studio is a later upgrade path. |
| Agent timing | **Pre-bake heavy → on-site light**: full pass before the session; on-site = facilitator-triggered single-item assists |
| LLM config | **In-app** at `/admin/settings` (DB), overrides `LLM_*` env vars |
| Sharing | One survey link per customer, shared across employees (per-browser resumable responses) |
| Governance | Confirm Cloudera data-handling/region/DPA/retention before real customer data — pilot with dummy data until then |

## 4. Stage 1 — Survey (done)
- Questionnaire defined once as data (`lib/questionnaire.ts`): About You · Identify the Friction ·
  Data & Tooling Readiness · Strategic Impact · Blue Sky · Candidate Use Cases (repeatable, optional).
- Public `/s/<slug>` link, no login, autosave + resume; admin dashboard to create/delete customers and
  export catalogs (Markdown / JSON / CSV).
- **Security:** admin token via Bearer/cookie only (never URL, constant-time compare); unguessable slug
  suffix; 24-byte response tokens; per-IP rate limiting; 128 KB answer cap; CSV-injection guard;
  delete-customer cascade for erasure.

## 5. Stage 2 — Cockpit (done)
- `/workshop/<slug>` (admin-gated), four phases as a **linked storyline**:
  1. **Dashboard** — recharts distributions over survey data + **editable session-signal cards** (see 6d).
  2. **Prioritize** — draggable Value×Feasibility 2×2; agent-scored chips; re-score assist.
  3. **AI Canvas** — 7-field canvas per use case, editable; re-draft / kill-idea assists.
  4. **Roadmap & RACI** — MVP backlog + editable RACI + reference architecture + Export (Markdown leave-behind).
- **Multi-agent pass** (`lib/agents/`): prioritize (deck's 1/3/5 rubric), canvas, architecture, kill-idea,
  synthesize. `POST /api/workshop/[slug]/generate` runs the pre-bake pass; `.../assist` runs single-item.
- Data stored in a `workshops` table (1:1 with a survey) as a JSON `WorkshopPack`.

## 6. Stage 2b — room-first additions (done)
- **(a) LLM config portal** — `/admin/settings` (base URL / key / model + Test connection), stored in a
  `settings` table; `lib/settings.getLlmConfig()` merges DB over env. Key masked in all reads. Fixes the
  "LLM not configured" banner without redeploys. (Key is at rest in the DB — documented.)
- **(b) Live-capture** — **Add use case (live)** on Prioritize + Canvas; captured use cases persist and
  support the assists. Cockpit is fully usable with **zero survey data**.
- **(c) Storyline** — tabs are numbered phases with ✓-when-done badges; a **Back/Next footer** carries
  the baton (Prioritize → "Take the top pick into the Canvas →" sets the focus); a **shared focus use
  case** threads Prioritize → Canvas → Roadmap (highlighted "Lead"); a story-so-far strip per tab.
- **(d) Grounded agents + editable signals** — canvas/kill/architecture prompts now **anchor in the
  Core process** and ban generic AI-assistant boilerplate. The three Dashboard cards (Solution patterns /
  Systems / HITL) are **editable chip selectors** (`pack.signals`), seeded from survey data; facilitator
  edits persist and are **fed into the agent context** (generate + assists), preserved across regenerate.

## 6c. Framework-alignment + deploy hardening (done — 2026-09)
Diffed the app against the customer-facing reference deck (`Integrated AI Use case discovery -
Customer Facing.pdf`, Vish Rajagopalan). App covers ~90%; closed the two real gaps + polish:
- **(a) North Star capture (Phase 01).** New `strategy` on `WorkshopPack` (`Strategy`: northStar /
  sponsor / valueDrivers / guardrails). Editable **Strategy & alignment** card at the top of the
  Dashboard (`components/workshop/Dashboard.tsx`), persisted via the existing `persist()` patch,
  folded into the agent context (`strategyToText` in `lib/aggregate.ts` → `generate/route.ts`),
  preserved across regenerate, and written to the leave-behind export (`## Strategy & alignment`).
- **(b) Data ask (Phase 05).** New `roadmap.dataAsk` (`DataAsk`: ask / owner / due). Editable
  orange card on the Roadmap tab (`components/workshop/Roadmap.tsx`); carried across regenerate;
  exported as `## Data ask`. The addendum's "#1 miss" is now recordable.
- **(c) Tab logo.** `app/icon.svg` — navy + Cloudera-orange dot-grid mark (Next auto-serves it).
- **(d) CML pipeline hardening.** `deploy_application.py` now polls the Application to `running`
  (`--wait`/`--wait-timeout`/`--no-wait`, `--selfcheck`) and prints/writes the URL
  (`/tmp/app_url.txt`); `create_jobs.py` **fails fast** if `RUNTIME_IDENTIFIER` is unset and warns
  if it isn't a Node runtime; `deploy-to-cml.yml` surfaces the URL in the run Summary. So a green
  CI run now means a genuinely reachable app.
- **Self-checks:** `scripts/check-strategy.ts` (strategyToText) and `deploy_application.py --selfcheck`.
- **Sample data:** `npx tsx scripts/seed-sample.ts` seeds `sample-northwind` (2 survey responses +
  full workshop pack incl. North Star + Data ask) for demos/testing.

## 7. Docs & deck
- `docs/SESSION_GUIDE.md` — room-first facilitation runbook (setup → 5-phase no-survey playbook → principles → contingencies).
- `docs/WORKED_EXAMPLE.md` — full end-to-end example (survey → cockpit storyline) for Open-Source LLM Pull Automation.
- `docs/DECK_ENHANCEMENTS.md` — slide-by-slide brief for enhancing the colleague's PDF deck.
- `docs/AI_Discovery_Workshop_Addendum.pptx` — Cloudera-branded 7-slide addendum; slide 6 mirrors the app's storyline.
- `README.md` (Docker + Workbench + governance + routes) and `cai_integration/` (CML Workbench deploy, sibling-repo pattern: `setup_project.py` · `jobs_config.yaml` + `create_jobs.py` + `trigger_jobs.py` · `git_sync.py` + `build_app.py` (Job chain) · `start-app.sh` · `deploy_application.py` · README).

## 8. Pending / open items
- ⛔ **Governance (blocker for real data):** confirm host/account (Cloudera-owned), data region + DPA,
  retention — before any real customer information. Pilot only with dummy data until resolved.
- **Real-LLM agent output unverified** — the agent *pipeline* is verified (graceful degradation, context
  wiring, defensive JSON parse), but not a live model's quality. Set an endpoint in `/admin/settings` → Test → Generate.
- **Postgres path** written + build-clean but not runtime-tested (no local Postgres).
- **CML Workbench deploy** scripted + **hardened** (health-poll, runtime preflight, URL in Summary;
  see 6c-d) but still not dry-run against a real Workbench (needs project + API key + Node runtime id).
- ~~**Full PPTX visual QA**~~ **done (2026-09)** — all 7 addendum slides rendered via LibreOffice and
  inspected; no blockers/overlaps/cutoffs. (Addendum PPTX predates the North Star / Data-ask fields.)
- **SQLite-on-CML-NFS** caveat: prefer Postgres for a high-traffic Workbench deployment.
- **No automated test suite / not under git** — verification is scripted curl smoke tests; consider `git init`.

## 9. Verification evidence (all green)
- `npm run build` + `tsc` clean across all stages; Docker image builds (exit 0) and runs (~2s ready).
- Stage 1: 19/19 HTTP smoke tests + rate-limit / CSV-injection / restart-persistence.
- Stage 2: 11/11 workshop HTTP tests; non-LLM logic test (aggregate, candidates, JSON parse, DB round-trip).
- Stage 2b: 13/13 settings + live-capture tests; storyline round-trip; **fixed** an "object is not iterable"
  crash in dashboard aggregation (missing `use_cases`) — `lib/aggregate.ts` now only iterates arrays.
- Seeded Marigold example (survey response + workshop pack + signals) verified live.

## 10. Quick reference
```bash
# Local dev
npm install && cp .env.example .env.local   # set ADMIN_TOKEN
npm run migrate && npm run dev               # http://localhost:3000

# Docker (current setup)
docker build -t ucd-survey .
docker run -d --name ucd_test -p 8080:8080 -e ADMIN_TOKEN=... [-e LLM_BASE_URL=... -e LLM_API_KEY=... -e LLM_MODEL=...] -v ucd_data:/app/data ucd-survey
#   /admin  ·  /admin/settings  ·  /s/<slug>  ·  /workshop/<slug>
docker logs ucd_test | tail   # troubleshoot   ·   docker rm -f ucd_test   # stop+wipe

# Catalog export to files
npm run export-catalog <slug>
```
**Key files:** `lib/questionnaire.ts` (survey) · `lib/db/` (datastore: surveys/responses/workshops/settings) ·
`lib/catalog.ts` · `lib/aggregate.ts` (dashboard + candidates + signalsToText) · `lib/settings.ts` · `lib/llm.ts` ·
`lib/agents/*` · `lib/workshop.ts` (WorkshopPack) · `app/s/[slug]` · `app/admin` (+ `/settings`) ·
`app/workshop/[slug]` + `components/workshop/*` · `app/api/{surveys,responses,catalog,workshop,settings}/*` ·
`Dockerfile` + `cai_integration/*`.
