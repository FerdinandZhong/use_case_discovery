# Worked Example — Open-Source LLM Pull Automation

An end-to-end walkthrough through the whole tool: the **pre-discovery survey** a customer stakeholder
fills in, then the **on-site cockpit** storyline — now five linked phases:

> **① Dashboard → ② Use cases → ③ Prioritize → ④ AI Canvas → ⑤ Roadmap & RACI**

Use it as a demo script, a training reference, or seed data.

> **Scenario.** *Open-source LLM pull requests are fully manual: a data scientist raises a Jira
> ticket → the lead approves it → the requester types in model name / version / details /
> justification / HuggingFace link / file list → an MLE pulls the model from the HuggingFace model
> hub, registers it into the internal registry, and notifies the requester. It happens several
> times a week and eats ~25% of one MLE's time.*

To show how the cockpit handles **more than one** use case, a second candidate — *model
drift-triggered auto-retraining* — surfaces **live in the room** (the customer never put it in the
survey). This is the common case: the room is the data source, and the ② Use cases page is where
you capture and differentiate each idea before scoring it.

The pack renders without an LLM because it was authored directly; with an LLM configured,
**Regenerate pack** reproduces the survey-derived use case, and the per-item assists run live.

---

## Part 1 — The pre-discovery survey (what the customer submits)

Respondent: **Priya Nair · IT / Data Architect · ML Platform / SRE**

### Step 1 · About You
| Field | Answer |
| --- | --- |
| Name | Priya Nair |
| Work email | priya@marigold.example |
| Role | IT / Data Architect |
| Team / department | ML Platform / SRE |

### Step 2 · Identify the Friction
- **Core process (≥20% of weekly effort):** *Open-source LLM pull requests are fully manual: a data
  scientist raises a Jira ticket → our lead approves it → the requester types in model name /
  version / details / justification / HuggingFace link / file list → an MLE pulls the model from the
  HuggingFace model hub, registers it into our internal registry, and notifies the requester. It
  happens several times a week and eats ~25% of one MLE's time.*
- **Primary blocker(s):** Waiting for human approval · Manual handoffs between teams · Repetitive
  ticket creation / triage
- **If you could predict one thing (90% accuracy):** *Which open-source LLM pull requests are
  low-risk (license-compatible, no security flags) and safe to auto-execute vs. which genuinely
  need human review.*

### Step 3 · Data & Tooling Readiness
- **Where the data lives:** Structured databases (registry) · Unstructured documents (runbooks) ·
  Internal communications (Jira / Slack)
- **Data trust (1–5):** **2** — outcomes aren't consistently labeled.

### Step 4 · Strategic Impact
- **Primary win:** Toil reduction · Velocity / cycle time
- **Risk tolerance:** High — license/security compliance means the auto-approve decision must be
  highly accurate (MVP keeps a human in the loop).

### Step 5 · Blue Sky
- *Show me every model pull in the last year — who approved it, the license, and which ones later
  caused a security or compliance issue — so I know which requests are actually risky.*

### Step 6 · Candidate Use Case — *Open-Source LLM Pull Automation*
> The per-use-case fields below are **optional in the survey** (most respondents skip them). When
> they're blank, you capture them live on the ② Use cases page — see Part 2.

| Field | Answer |
| --- | --- |
| Solution pattern | Multi-step agent that executes actions across tools (with approvals) · Classification / routing |
| Current steps | Data scientist raises Jira ticket → lead approves → requester enters model name/version/details/justification/HuggingFace link/file list → MLE pulls from HuggingFace hub → registers into internal registry → notifies requester. |
| Systems to touch | Jira / ServiceNow · ML platform / model registry · Internal APIs (HuggingFace Hub) · Slack / Teams |
| Human-in-the-loop | Approval gate before any action |
| Frequency | Weekly |
| Cost of inaction | ~25% of one MLE's time each week lost to ticket wrangling and manual pulls; onboarding lags; stale/duplicate models accumulate. |
| Data history | ~12 months of Jira model-pull tickets with approvals and outcomes; HuggingFace model cards/metadata; onboarding runbook in Confluence. |
| Compliance | License compliance (non-commercial / gated models) and a security scan are mandatory; every registration needs an audit trail; if the agent is down, fall back to the manual ticket flow. |
| "Kill the idea" | HuggingFace license/security signals can be inconsistent and gated models need manual auth; if past outcomes aren't labeled, a risk classifier won't train — fall back to an assistant that validates license+security and drafts the ticket but always routes to a human. |

---

## Part 2 — The on-site cockpit (the storyline)

### ① Dashboard — "Why are we here"
The submitted survey populates the distributions. For Marigold (1 respondent):
- **Value drivers:** Toil reduction, Cycle time
- **Blockers:** Approval gates, Manual handoffs, Repetitive tickets
- **Data trust:** 2 / 5

Three cards — **Solution patterns · Systems · Human-in-the-loop** — are **editable chips**. They
seed from the survey when present; when the survey skipped them, tap to set them live. They also
guide the AI on the next pages.

*North Star for the session: cut manual toil and lead time in the ML platform team.*

→ **Detail the use cases →**

### ② Use cases — mine & detail  *(new)*
One editable card per candidate. This is where the tool stops mixing signals across ideas and
**differentiates each use case** — refine its process and tag its own pattern / systems /
human-in-the-loop. **Score value & feasibility** reads *that card's* details, so the evaluation is
grounded and concise.

**Card A — Open-Source LLM Pull Automation** · *from survey*
- **Current process / details:** Jira ticket → lead approves → requester enters model
  name/version/HF link/file list/justification → MLE pulls from the HF hub → registers to the
  internal registry → notifies requester. ~Weekly; ~25% of one MLE's time.
- **Solution pattern:** Multi-step agent · Classification / routing
- **Systems to touch:** Jira / ServiceNow · ML registry · Internal APIs (HF Hub) · Slack
- **Human-in-the-loop:** Approval gate before any action
- **Score → Value 63% · Feasibility 63%** — *"High-frequency manual toil with a clean integration
  surface (Jira, HF Hub, registry APIs); needs a human in the loop for license/security, so
  semi-auto first."*

**Card B — Model drift-triggered auto-retraining** · *added live in the room*
- **Current process / details:** When monitoring flags accuracy drift on a deployed model, an MLE
  manually opens a retraining job, revalidates, and promotes — today ad hoc and reactive.
- **Solution pattern:** Anomaly detection · Multi-step agent
- **Systems to touch:** ML registry · CI/CD & orchestration · Databases / warehouse
- **Human-in-the-loop:** Review output before promotion
- **Score → Value 50% · Feasibility 38%** — *"Valuable, but drift labels and safe-promotion gates
  are immature; sequence it after the pull-automation quick win."*

→ **Prioritize by value × feasibility →**

### ③ Prioritize — value × feasibility
Both use cases sit on the 2×2. The lead lands in **Quick Wins** (upper-right); retraining sits
higher-value-but-harder (upper-left), a fast-follow.

Scores behind **Card A** (the deck's 1/3/5 rubric):

| Business Value | | Technical Feasibility | |
| --- | --- | --- | --- |
| Strategic alignment | 3 | Data availability | 3 |
| Frequency / volume | 5 | Tolerance for error | 3 |
| Potential ROI | 3 | Complexity of logic | 3 |
| User experience | 3 | Integration ease | 5 |

→ **Value ≈ 0.63 · Feasibility ≈ 0.63.** The top-ranked use case becomes the **focus** carried into
the Canvas and highlighted on the Roadmap.

### ④ AI Canvas — design the focus use case
| Field | Content |
| --- | --- |
| **Prediction** | Which open-source LLM pull requests are low-risk — license-compatible, no security flags, reasonable size/gated status — and therefore safe to straight-through vs. route for human review. |
| **Judgment** | A wrong auto-approval (pulling a non-compliant, gated, or unsafe model) is costly — license violation or security exposure — so bias toward review; a wrong hold merely adds delay. Optimize precision on approvals. |
| **Action** | Auto-draft the Jira ticket, validate the HuggingFace link + file list + license + justification, route low-risk → straight-through pull+register and high-risk → a human approval queue; an MLE agent then pulls from the HF hub, registers into the internal registry, and notifies the requester. |
| **Outcome** | % straight-through, time from ticket to registered model, license/security violations caught before registration, manual steps removed, duplicate-model rate. |
| **Training** | ~12 months of Jira model-pull tickets with approvals and outcomes, HuggingFace model-card metadata (license, downloads, security scan), and the onboarding runbook. |
| **Input** | The request (model name/version, HF link, file list, justification), the HF model card/metadata, the internal license/security policy, and current registry state. |
| **Feedback** | Capture approver overrides and any post-registration security/compliance issues to continuously retrain the risk classifier. |

**Kill the idea:** HuggingFace license and security signals can be inconsistent, and gated models
need manual authentication; if past outcomes aren't consistently labeled, the risk classifier can't
be trained. *Mitigation:* ship an assistant that validates license + security and drafts the ticket,
but always routes to a human — earn autonomy later.

### ⑤ Roadmap & RACI — commit
The backlog now carries **one item per use case, ranked**, each with its real name — the lead is
tagged, and the live-added retraining use case appears too. (If you add a use case on ② after the
pack was generated, click **Rebuild backlog** to re-run the synthesis over the current list — no
stale IDs, nothing dropped.)

**Prioritized backlog (MVP)**
1. **Open-Source LLM Pull Automation** — *Lead* · **MVP:** an assistant that auto-drafts the Jira
   ticket, validates the HF link / file list / license / justification, and flags risk — a human
   still approves and the MLE executes the pull. · **Next:** pull 12 months of tickets + outcomes,
   label license/security results, stand up the validation agent against the HF Hub + registry APIs.
2. **Model drift-triggered auto-retraining** — **MVP:** drift-triggered retraining POC on one model
   with human sign-off before promotion. · **Next:** instrument drift metrics and capture promotion
   outcomes to build the label set.

**RACI**

| Task | R | A | C | I |
| --- | --- | --- | --- | --- |
| Build the validation + ticket-drafting agent | MLOps engineer | SRE lead | Security / IT architect | Requesting data scientists |
| Define license + security approval policy | Security / IT architect | SRE lead | Legal | ML platform team |
| Provide historical tickets + outcomes | ML platform team | SRE lead | MLOps engineer | Data scientists |

**Draft reference architecture (Cloudera):** Jira / ServiceNow (intake + approval) → Cloudera AI
Workbench (multi-step pull agent + routing) → Cloudera AI Inference (risk classification + drafting)
+ Vector DB (RAG over runbooks & license policy) → HuggingFace Hub (source + model-card metadata) →
Internal model registry (destination, with audit trail).

**The data ask (the close):** *"To build this, send us a 12-month Jira export of model-pull tickets
with resolution + rollback records, plus the onboarding runbook and license policy, within 2 weeks."*

---

## Reproduce it
Seeded via the API against the running app (admin token required):
1. `POST /api/surveys` → create the customer (the slug gets a random suffix, e.g. `marigold-ab9f…`).
2. `POST /api/responses` + `PATCH /api/responses/{token}` (status `submitted`) → the Part-1 answers.
3. `PATCH /api/workshop/{slug}` → the Part-2 pack (both use cases + scores + canvas + architecture + roadmap).

In the cockpit:
- **② Use cases** — edit a card's process/pattern/systems/HITL (autosaves) or **Add use case (live)**
  for Card B; **Score value & feasibility** per card.
- **⑤ Roadmap** — **Rebuild backlog** picks up anything added live.

With an LLM configured in **Admin → LLM settings**, **Regenerate pack** produces Part 2 from the
Part-1 answers automatically, and the per-item assists (Score / Re-draft / Kill-the-idea) run live.
