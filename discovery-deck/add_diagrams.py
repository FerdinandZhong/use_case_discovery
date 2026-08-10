#!/usr/bin/env python3
"""Add two simple box diagrams into the empty image halves:
  slide 4 (silos, right half)  -> Entities + Relationships + Semantic context = grounded AI
  slide 5 (TBox/ABox, left half) -> question -> vocabulary(TBox) -> data(ABox) -> answer
Native shapes so they stay editable. Runs on the packed master."""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml import parse_xml

BUNONE = '<a:buNone xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>'

NAVY = RGBColor(0x12, 0x00, 0x46)
ORANGE = RGBColor(0xFF, 0x55, 0x0C)
LIGHT = RGBColor(0xF2, 0xF1, 0xF6)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
MASTER = "discovery-deck-master.pptx"


def box(slide, x, y, w, h, text, fill, fg, size=11, bold=True, outline=None):
    sp = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    sp.fill.solid(); sp.fill.fore_color.rgb = fill
    if outline is not None:
        sp.line.color.rgb = outline; sp.line.width = Pt(1.25)
    else:
        sp.line.fill.background()
    tf = sp.text_frame; tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_top = Pt(2); tf.margin_bottom = Pt(2)
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    r = p.add_run(); r.text = text
    r.font.size = Pt(size); r.font.bold = bold; r.font.color.rgb = fg; r.font.name = "Arial"
    return sp


def arrow(slide, x, y, w, h, down=True):
    shp = MSO_SHAPE.DOWN_ARROW if down else MSO_SHAPE.RIGHT_ARROW
    sp = slide.shapes.add_shape(shp, Inches(x), Inches(y), Inches(w), Inches(h))
    sp.fill.solid(); sp.fill.fore_color.rgb = ORANGE; sp.line.fill.background()
    return sp


def label(slide, x, y, w, text, color, size=10):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(0.3))
    p = tb.text_frame.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    r = p.add_run(); r.text = text
    r.font.size = Pt(size); r.font.bold = True; r.font.color.rgb = color; r.font.name = "Arial"


def main():
    prs = Presentation(MASTER)

    # ---- slide 4 (index 3): KG on the right half ----
    s = prs.slides[3]
    rx = 5.25
    for i, (t, _) in enumerate([("Entities", 0), ("Relationships", 0), ("Semantic\ncontext", 0)]):
        box(s, rx + i * 1.48, 1.75, 1.35, 0.85, t, LIGHT, NAVY, size=11, outline=ORANGE)
        if i < 2:
            label(s, rx + i * 1.48 + 1.30, 1.95, 0.25, "+", ORANGE, size=16)
    arrow(s, rx + 2.0, 2.75, 0.4, 0.55)
    box(s, rx, 3.45, 4.3, 0.95, "= Connected knowledge:\nthe layer that grounds AI", NAVY, WHITE, size=13)

    # ---- slide 5 (index 4): TBox/ABox flow on the left half ----
    s = prs.slides[4]
    lx, lw = 0.55, 4.05
    steps = [
        ("Your question (plain language)", LIGHT, NAVY, None, None),
        ("Map to your vocabulary", WHITE, NAVY, ORANGE, "TBox"),
        ("Pull the exact governed data", WHITE, NAVY, ORANGE, "ABox"),
        ("Grounded answer", NAVY, WHITE, None, None),
    ]
    y = 1.55
    for i, (t, fill, fg, outline, tag) in enumerate(steps):
        box(s, lx, y, lw, 0.62, t, fill, fg, size=12, outline=outline)
        if tag:
            label(s, lx + lw + 0.05, y + 0.14, 0.9, tag, ORANGE, size=11)
        if i < len(steps) - 1:
            arrow(s, lx + lw / 2 - 0.12, y + 0.64, 0.24, 0.32)
        y += 0.94

    polish_slide6(prs)

    prs.save(MASTER)
    print("added diagrams to slides 4, 5 and polished slide 6")


def _find_slide(prs, marker):
    for s in prs.slides:
        for sh in s.shapes:
            if sh.has_text_frame and marker in sh.text_frame.text:
                return s
    return None


def polish_slide6(prs):
    s = _find_slide(prs, "Where could AI help")
    if s is None:
        print("slide 6 not found, skipping")
        return

    # 1. bridge subhead (callback to the ontology slide's closing question)
    for sh in s.shapes:
        if sh.has_text_frame and "strong first use case" in sh.text_frame.text:
            for p in sh.text_frame.paragraphs:
                for r in p.runs:
                    r.text = ""
            sh.text_frame.paragraphs[0].runs and setattr(
                sh.text_frame.paragraphs[0].runs[0], "text",
                "Now your data can ground AI. So where do we point it first?")

    # 2. restructure the left body into orange-headed groups + bullets
    body = None
    for sh in s.shapes:
        if sh.has_text_frame and "cross-referencing" in sh.text_frame.text:
            body = sh
            break
    if body is not None:
        tf = body.text_frame
        tf.clear()
        rows = [
            ("Signs worth a look", True),
            ("Repetitive cross-referencing across disconnected systems", False),
            ("Manual review, triage, and approvals that gate the work", False),
            ("Answers that live in people’s heads, not any system", False),
            ("", None),
            ("What makes a strong first pick", True),
            ("The work is painful and repeats often", False),
            ("The data to ground it exists (that’s your ontology)", False),
            ("There’s a clear decision or action at the end", False),
        ]
        for i, (text, header) in enumerate(rows):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            pPr = p._p.get_or_add_pPr()
            pPr.append(parse_xml(BUNONE))
            pPr.set("indent", "0")
            pPr.set("marL", "182880" if header is False else "0")
            if header is None:  # spacer
                p.add_run().text = ""
                for r in p.runs:
                    r.font.size = Pt(6)
                continue
            r = p.add_run()
            r.text = text if header else ("•   " + text)
            r.font.name = "Arial"
            r.font.bold = bool(header)
            r.font.size = Pt(13 if header else 12)
            r.font.color.rgb = ORANGE if header else RGBColor(0x1F, 0x2A, 0x32)

    # 3. right-side "pain + data = use case" combiner (mirrors the KG / TBox motif)
    box(s, 5.25, 2.0, 1.95, 0.95, "Painful, repetitive work", LIGHT, NAVY, size=12, outline=ORANGE)
    label(s, 7.2, 2.24, 0.35, "+", ORANGE, size=20)
    box(s, 7.6, 2.0, 1.95, 0.95, "Data we can ground", LIGHT, NAVY, size=12, outline=ORANGE)
    arrow(s, 7.28, 3.05, 0.3, 0.5)
    box(s, 5.6, 3.72, 3.8, 0.95, "A use case worth building", NAVY, WHITE, size=14)


if __name__ == "__main__":
    main()
