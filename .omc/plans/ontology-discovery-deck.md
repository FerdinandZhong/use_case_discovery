# Plan: "Bring AI to Your Data" — ontology-first use-case discovery deck (<10 slides)

## Requirements Summary
A short (≤9 slides) Cloudera **use-case discovery** deck a rep presents to a
customer's Data department, framed through data + ontology. NOT a reuse of the
Evolve deck (that was wrong). Angle:
- **a. Why AI is needed** — manual work doesn't scale; but generic AI doesn't
  understand your business → hallucinates.
- **b. How data grants AI intelligence** — knowledge graphs + ontology (TBox/ABox)
  as the "AI context layer".
- **c. Challenges/blockers in daily manual ops** — discovery prompts: can AI help?
- **d. Solution examples** — proven agentic workflows.

### Source material (grounding)
- `~/Documents/materials/applied_ai_decks/Copy of Rameez_Chatni_SKO_27_MainStage.pdf`
  (biotech): "Data silos ≠ knowledge silos"; KG = Entities + Relationships +
  Semantic Context = context layer that makes AI grounded.
- `~/Documents/materials/applied_ai_decks/Hallucination_Guardrails_Cloudera.en.pptx.pdf`
  (battery mfg): "gap isn't capability — it's a missing semantic layer = ontology";
  **TBox** = Class/Relation/Property/Axiom (Part/BOM/Variant/Supplier/ECN; `part_id`
  unique); **ABox** = governed instances read on demand; NL2OntologyQuery loop.
- Solution examples: Evolve deck (banking chatbot-with-memory, trade-fraud 6-agent),
  battery defect-triage guardrails (human intervention ~100%→<20%),
  banking demo https://agent-studio-workflows.lovable.app/#banking.

## Slide-by-slide outline (9)
1. **Title** — "Bring AI to Your Data: a use-case discovery" · `{{CUSTOMER}}` · presenter.
2. **Why AI now** — manual, repetitive work doesn't scale; AI can offload it. Tension:
   out-of-the-box AI doesn't know *your* business → confident, wrong answers.
3. **The gap isn't capability — it's meaning** — bare RAG matches text not meaning;
   agents get raw codes (`defect_cd=7`, `ALLOY_CD`) and guess. Missing layer = the
   ontology. [Hallucination deck]
4. **Data silos ≠ knowledge silos** — unifying data ≠ connected knowledge; missing
   semantic relationships. KG = Entities + Relationships + Semantic Context = the AI
   context layer that grounds AI. Simple node-graph diagram. [Rameez]
5. **How we grant AI intelligence: TBox + ABox** — TBox = your concepts/relations/
   axioms (vocabulary); ABox = governed instances on demand. Loop: NL question →
   NL2OntologyQuery → ABox → grounded answer. Two domain examples (biotech
   genes/drugs/pathways; battery Part/BOM/lot). Small 4-step flow diagram. [both]
6. **Your daily manual operations — where can AI help?** — discovery prompts:
   repetitive cross-referencing across silos, manual triage/review, tribal knowledge,
   multi-system lookups. Frames candidate use cases (ties to the /d discovery web deck).
7. **Solution examples** — proven agentic workflows on Cloudera: banking chatbot-with-
   memory; trade-fraud 6-agent (30–90 min → seconds); battery defect triage w/
   guardrails (~100%→<20% human). [Evolve + banking demo + Hallucination]
8. **Why Cloudera** — ontology + agents governed *on your data* (SDX/Atlas glossary =
   TBox, Iceberg, Agent Studio, RAG Studio, AI Inference). AI comes to the data.
9. **Let's map YOUR use cases** — discovery hand-off → `{{DECK_URL}}` + QR.

## Build approach
- Fresh build via the `document-skills:pptx` workflow (thumbnail → unpack → assemble
  slides from template layouts → edit XML → clean → pack). No Evolve reuse.
- **Base template**: thumbnail BOTH candidates (AI Specialist Panel + main Cloudera
  Template) first, pick whichever has the cleanest title/section/content/diagram layouts.
- **Depth = business-first, light technical**: lead with business pain (AI guesses your
  codes); introduce TBox/ABox as "your vocabulary + your governed facts" with one concrete
  example each; minimal jargon; NL2OntologyQuery shown as a simple loop, not architecture.
- Two light conceptual diagrams (slide 4 KG nodes, slide 5 TBox→ABox flow) built from
  native shapes/connectors so they stay editable.
- Reuse the proven parametrizer pattern: `{{CUSTOMER}}` / `{{DECK_URL}}` placeholders +
  QR generated at build time (`sales-deck/build_sales_deck.py` style). Output to project dir.
- **Replace** the prior Evolve-based `sales-deck/` (master, sample, unpacked, README,
  parametrizer) with this deck once the new one passes QA.

## Acceptance Criteria (testable)
- Deck is **≤ 9 slides**.
- Contains a slide explicitly covering each of a/b/c/d.
- Has a dedicated **TBox/ABox** slide naming both and the NL2OntologyQuery loop.
- Slide 4 states "Entities + Relationships + Semantic Context".
- Final slide shows a working `{{DECK_URL}}` QR that resolves to `/d/<slug>`.
- Cloudera-branded (template master, brand colors, logo).
- Renders with no overlap/overflow/placeholder residue (LibreOffice + subagent QA pass).
- Parametrizer swaps customer + URL with no `{{}}` residue.

## Risks & Mitigations
- **Diagram complexity in OOXML** → keep diagrams to boxes + connectors + labels; QA visually.
- **Content too dense for ≤9 slides** → one idea per slide, speaker detail in notes.
- **Ontology concepts too abstract for a sales audience** → anchor every abstract point
  in the battery/biotech concrete example.
- **Build vs dev-server `.next` clobber** (past issue) → build only with :3000 stopped.

## Verification
1. `python -m markitdown deck.pptx` — 9 slides, a/b/c/d + TBox/ABox present, no placeholder residue.
2. LibreOffice render → `pdftoppm` → fresh-eyes subagent visual QA; fix-and-verify loop.
3. Run parametrizer for a test customer; confirm title + discovery URL/QR correct and QR resolves.
4. Open in PowerPoint/Keynote for a final human eyeball.
