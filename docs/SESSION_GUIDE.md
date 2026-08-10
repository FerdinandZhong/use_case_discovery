# Running an AI Use Case Discovery Session — Room-First Playbook

_Companion to `AI Discovery Workshop.pdf`. Written for the common case: **the customer did not
return the pre-survey and will only open up in the room.**_

## Core premise
The pre-survey is an **accelerant, not a prerequisite**. Design every session to stand on its own
with zero pre-data — **the room is the data source**. The survey, when you get it, just gives the
session a running start (it pre-fills the cockpit's Dashboard and seeds the "Generate pack" pass).

Flow: **elicit → converge → deepen → commit**, mapped onto the deck's five phases.

---

## Before the session

**Get the right people, or reschedule.** Each role has a job (deck slide 10):
- **Executive Sponsor** — opens Phase 1, states the North Star, unblocks. *If they can't attend,
  reschedule* — without the North Star you can't prioritize.
- **Business / Product SMEs** — the pain owners; your richest source when there's no survey.
- **IT / Data Architect** — kills fantasy use cases early on data availability & security.
- **End Users** — the adoption reality check.

**Bring a discovery kit, not a blank page:**
- 2–3 **hypothesis use cases** for their industry so the room *reacts* instead of inventing cold.
- The **peel-the-onion** question bank (deck slide 12), the **1/3/5 rubric** (slide 14), a blank **AI
  Canvas** (slide 15).
- The **cockpit** open on the projector; **Miro / whiteboard** as the low-tech backup.

**Logistics & expectations:** projector + the workshop cockpit; visible timeboxes; a "parking lot"
for tangents; a named scribe. Send the goal in writing beforehand: *"we'll leave with 3–5 prioritized
use cases and owners."*

---

## In the room — phase by phase (no-survey mode)

### Phase 1 — Why are we here (45 min)
Sponsor states the North Star and 2–3 business priorities. Frame **Art of the Possible vs Science of
the Probable** and name the goal (a prioritized backlog). Establish the **"Kill the Idea" norm** now
so challenge feels safe later.

### Phase 2 — Problem Mining (60 min) — *this replaces the survey*
Run **structured** elicitation, not open discussion:
- **"Day in the life"** per SME → surface repetitive, high-effort, error-prone steps.
- **Silent-write, then round-robin** (cards / sticky notes) so the loudest voice doesn't dominate and
  quieter SMEs contribute.
- Push each candidate through the **onion**: frequency & cost of *not* solving → biggest bottleneck →
  data availability/history → risk & compliance.
- Capture each one into the cockpit with **Add use case (live)** on the Prioritize tab (name + notes).
  Deliberately **do not start with technology.**

### Phase 3 — Prioritization (45 min)
**Dot-vote** on value & feasibility, or apply the 1/3/5 rubric. In the cockpit, click **Re-score** to
let the agent propose scores from the live notes; the room drags the chips to argue — the argument is
the value. Aim to surface the **Quick Wins** quadrant.

### Phase 4 — Solution Ideation (60 min)
Pick the top 1–2 (favor Quick Wins). Fill the **AI Canvas** (agent drafts, room corrects) and sketch
a first-draft reference architecture. Run **Kill-the-Idea** on the chosen one to stress-test it.

### Phase 5 — Roadmap & Ownership (30 min)
Define the **MVP**, the **RACI**, and — critical when there was no survey — a concrete **data ask**:
*"to build this, send us X within N weeks."* That converts the room's energy into a follow-up
obligation. **Export** the leave-behind before you leave.

---

## Facilitator principles
- Lead with **problems, never tech.**
- Use the **sponsor** to break stalemates.
- **Timebox hard**; park tangents.
- Make **Kill-the-Idea** routine, not personal.
- End with **owners and dates** — never "we'll follow up."

## Contingencies
- **Sponsor absent** → reschedule; you'll lack the North Star to prioritize against.
- **One dominant voice** → silent-write + round-robin.
- **"We have no clean data"** → that IS a finding; it pushes use cases toward "challenging" and often
  toward RAG/assistant patterns over prediction.
- **Skepticism** → anchor on one Quick Win with a measurable MVP.
- **Low turnout** → still run Phase 2 elicitation; treat outputs as hypotheses to validate later.

## How the cockpit supports this (no survey needed)
- **Dashboard** — populated only if survey responses exist; otherwise skip to Prioritize.
- **Prioritize / AI Canvas** — **Add use case (live)** captures room input; **Re-score / Re-draft /
  Kill-the-idea** run the agents on that live context. Requires the LLM configured in **Admin →
  LLM settings** (works offline for manual editing; AI buttons need the endpoint).
- **Roadmap & RACI** — editable; **Export** produces the Markdown leave-behind.
