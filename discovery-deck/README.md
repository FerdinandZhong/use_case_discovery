# Discovery deck — "Bring AI to your data"

A short (9-slide) Cloudera use-case discovery deck a rep presents to a customer's
**Data department**, framed through data + ontology. Built on the Cloudera
"AI Specialist Panel" template.

Narrative: title → why AI (manual work doesn't scale; generic AI guesses) → the
gap is meaning (bare RAG / bare agent) → data silos ≠ knowledge silos (KG =
Entities+Relationships+Semantic Context) → TBox + ABox (your vocabulary + governed
facts) → where can AI help in your day (discovery prompts) → proven agentic
solutions (banking / trade-fraud / battery triage) → why Cloudera → **Let's map your
use cases** (discovery hand-off with `/d/<slug>` link + QR).

Grounded in: Rameez SKO (biotech KG) and Hallucination-Guardrails (battery TBox/ABox)
reference decks; solution examples from the Evolve deck + banking demo.

## Files
- `discovery-deck-master.pptx` — master with `{{CUSTOMER}}` / `{{DECK_URL}}` placeholders.
- `build_deck.py` — per-customer builder (fills placeholders + drops the QR).
- `fill_content.py` — content map applied to the template (re-run only if rebuilding from template).
- `add_diagrams.py` — adds the two box diagrams (slides 4 & 5). Run once after packing the master.
- `unpacked/` — editable OOXML source of the master.
- `sample-Acme.pptx` — example output.

## Build a customer deck
```bash
python3 discovery-deck/build_deck.py \
  --customer "Acme Corp" \
  --url "https://<host>/d/acme-1a2b3c" \
  --out ~/Desktop/Acme-discovery.pptx
```
`--url` is that customer's discovery-deck link (Copy **Deck link** in `/admin`).
The URL isn't baked into the master — pass the current host each time.

## Rebuild the master from the template
```bash
SK=~/.claude/plugins/cache/anthropic-agent-skills/document-skills/*/skills/pptx
# (start from a fresh unpack of the template, then:)
python3 discovery-deck/fill_content.py
python3 $SK/scripts/clean.py discovery-deck/unpacked/
python3 $SK/scripts/office/pack.py discovery-deck/unpacked/ discovery-deck/discovery-deck-master.pptx \
  --original ~/Documents/materials/"Cloudera Slide Template - AI Specialist Panel.pptx"
python3 discovery-deck/add_diagrams.py
```

Requires `pip install "qrcode[pil]" python-pptx`. Visual QA needs LibreOffice.
