#!/usr/bin/env python3
"""Fill the AI Specialist Panel template placeholders with the discovery-deck
content. Deterministic ordered string replacement on the unpacked slide XML.
Repeated placeholders (columns) are filled in document order."""
from pathlib import Path

U = Path(__file__).resolve().parent / "unpacked" / "ppt" / "slides"

# each slide: ordered list of (placeholder, replacement); repeated placeholders
# are consumed first-occurrence-first, so list them in document order.
SLIDES = {
    "slide1.xml": [
        ("Monday, August 22, 2024", "AI USE CASE DISCOVERY"),
        ("This is a double title headline", "Bring AI to your data."),
        ("for a presentation cover", "Give it the meaning to act."),
        ("Subhead goes here", "Prepared for {{CUSTOMER}}"),
    ],
    "slide4.xml": [  # Why AI now
        ("Headline  One Column Text", "Your experts spend their days on manual work"),
        ("Subhead text goes here or delete this text bar", "Why AI, and why it needs your data"),
        ("This is the style for the first line of copy", "Skilled people burn hours on repetitive, manual steps that don’t scale."),
        ("This is the style for the second line of copy", "AI can take that toil, if it truly understands your business."),
        ("This is the style for the third line of copy", "Out of the box it doesn’t: it fills the gaps by guessing."),
        ("This is the style for the fourth line of copy", "Confident, wrong answers erode trust, and the fix isn't a bigger model. So what's actually missing?"),
    ],
    "slide5.xml": [  # The gap: Bare RAG | Bare Agent (two columns)
        ("Headline Two Column Text", "The gap isn’t capability. It’s meaning"),
        ("Subhead text goes here or delete this text bar", "Why generic AI hallucinates on your data"),
        # column 1 (Bare RAG)
        ("This is the style for the first line of copy", "Bare RAG matches text, not meaning."),
        ("This is the style for the second line of copy", "It finds a doc that says “inventory” but can’t tell ERP stock from WMS stock."),
        ("This is the style for the third line of copy", "Vector similarity is not business semantics."),
        ("This is the style for the fourth line of copy", "Right words, wrong meaning."),
        # column 2 (Bare Agent)
        ("This is the style for the first line of copy", "Bare agents get raw codes from tools."),
        ("This is the style for the second line of copy", "defect_cd=7, ALLOY_CD: the model has no idea which defect or grade."),
        ("This is the style for the third line of copy", "So it guesses to fill the gap."),
        ("This is the style for the fourth line of copy", "The missing layer is the ontology."),
    ],
    "slide6.xml": [  # Data silos != knowledge silos
        ("Headline  One Column Text With Image on Right", "Data together is not knowledge connected"),
        ("Subhead text goes here or delete this text bar", "The lesson from pharma R&D"),
        ("This is the style for the first line of copy", "You can pool every dataset and still not connect the knowledge."),
        ("This is the style for the second line of copy", "What’s missing is the semantic relationships between things."),
        ("This is the style for the third line of copy", "A knowledge graph adds them: Entities + Relationships + Semantic Context."),
        ("This is the style for the fourth line of copy", "That becomes the context layer that makes AI grounded, not guessing."),
    ],
    "slide7.xml": [  # TBox + ABox
        ("Headline  One Column Text With Image on Left", "Give AI your vocabulary: TBox + ABox"),
        ("Subhead text goes here or delete this text bar", "The ontology, in two parts"),
        ("This is the style for the first line of copy", "TBox = your concepts and rules: Part, BOM, Supplier; “part_id is unique.”"),
        ("This is the style for the second line of copy", "ABox = the governed facts, read on demand from your systems."),
        ("This is the style for the third line of copy", "Ask in plain language → map to your vocabulary → pull the exact data → grounded answer."),
        ("This is the style for the fourth line of copy", "Now AI reads your data by meaning, trustworthy enough for real work. The only question left: where to point it first."),
    ],
    "slide18.xml": [  # Challenges (clone of slide4)
        ("Headline  One Column Text", "Where could AI help in your day-to-day?"),
        ("Subhead text goes here or delete this text bar", "A strong first use case = painful manual work + data to ground the AI"),
        ("This is the style for the first line of copy", "Repetitive cross-referencing across disconnected systems."),
        ("This is the style for the second line of copy", "Manual review, triage, and approvals that gate the work."),
        ("This is the style for the third line of copy", "Answers that live in people’s heads, not in any system."),
        ("This is the style for the fourth line of copy", "Which of these sound like your team? That’s where we start."),
    ],
    "slide8.xml": [  # Solution examples (three column table)
        ("Headline  Three Column Table", "Proven agentic workflows on Cloudera"),
        ("Subhead text goes here or delete this text bar", "Agents that replace manual review, grounded in governed data"),
        # column 1
        ("Section Title", "Banking support"), ("Subhead", "Chatbot with memory"),
        ("Orange callout:", "Recalls:"), ("This is the style for the third line of copy", "the customer across every session"),
        ("Orange callout:", "Retrieves:"), ("This is the style for the third line of copy", "live account data from the lakehouse"),
        ("Orange callout:", "Reasons:"), ("This is the style for the third line of copy", "over cross-session patterns to escalate"),
        ("Orange callout:", "Result:"), ("This is the style for the third line of copy", "no more “I explained this last time”"),
        # column 2
        ("Section Title", "Trade fraud"), ("Subhead", "Six-agent pipeline"),
        ("Orange callout:", "Screens:"), ("This is the style for the third line of copy", "every declaration, not a sample"),
        ("Orange callout:", "Extracts:"), ("This is the style for the third line of copy", "invoice fields via OCR"),
        ("Orange callout:", "Checks:"), ("This is the style for the third line of copy", "prices, sanctions, collusion patterns"),
        ("Orange callout:", "Result:"), ("This is the style for the third line of copy", "30-90 min review → seconds"),
        # column 3
        ("Section Title", "Manufacturing"), ("Subhead", "Defect triage + guardrails"),
        ("Orange callout:", "Grounds:"), ("This is the style for the third line of copy", "every claim in an SOP § or data row"),
        ("Orange callout:", "Blocks:"), ("This is the style for the third line of copy", "invented part numbers and action codes"),
        ("Orange callout:", "Abstains:"), ("This is the style for the third line of copy", "when the evidence is insufficient"),
        ("Orange callout:", "Result:"), ("This is the style for the third line of copy", "human checks ~100% → <20%"),
    ],
    "slide19.xml": [  # Why Cloudera (clone of slide4)
        ("Headline  One Column Text", "Why Cloudera"),
        ("Subhead text goes here or delete this text bar", "Ontology and agents, governed, on your data"),
        ("This is the style for the first line of copy", "Your data stays put. AI runs where the data already lives."),
        ("This is the style for the second line of copy", "One governed semantic layer: Atlas glossary as your TBox, Iceberg for the facts."),
        ("This is the style for the third line of copy", "Build agents in Agent Studio; serve models in-platform with full lineage."),
        ("This is the style for the fourth line of copy", "Prevent bad data in, verify claims out: hallucination caught or impossible."),
    ],
    "slide9.xml": [  # Discovery CTA (white background) + QR added by parametrizer
        ("Headline  White Background", "Let’s map your use cases"),
        ("Subhead text goes here or delete this text bar", "Your discovery deck"),
        ("Bullet point 1 Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua",
         "We walk your daily workflows together: the steps, the data, and the tools."),
        ("Bullet point 2 Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat",
         "We pinpoint where AI agents can take the manual load off your team."),
        ("Bullet point 3 Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur",
         "It takes about 10 minutes, and it seeds the workshop."),
        ("Bullet point 4 Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum",
         "Scan the code or open your link to start:"),
        ("Bullet point 5 Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip",
         "{{DECK_URL}}"),
    ],
}


def rep_seq(text, old, new):
    idx = text.find(old)
    if idx == -1:
        raise SystemExit(f"placeholder not found: {old!r}")
    return text[:idx] + new + text[idx + len(old):]


def main():
    for fname, reps in SLIDES.items():
        p = U / fname
        x = p.read_text(encoding="utf-8")
        for old, new in reps:
            x = rep_seq(x, old, new)
        p.write_text(x, encoding="utf-8")
        print(f"filled {fname} ({len(reps)} replacements)")


if __name__ == "__main__":
    main()
