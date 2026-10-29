import json
import re
from pathlib import Path
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Flowable
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/i18n/termsContent.ts"
OUTPUT = ROOT / "public/downloads/autopilots-algemene-servicevoorwaarden-v1.9.pdf"

source = SOURCE.read_text(encoding="utf-8").split("const localeMeta:")[0]
sections = []
for title, paragraphs in re.findall(r'\{title:("(?:[^"\\]|\\.)*"),paragraphs:\[(.*?)\]\}', source, re.S):
    sections.append((json.loads(title), json.loads("[" + paragraphs + "]")))
if len(sections) != 18:
    raise RuntimeError(f"Expected 18 terms sections, found {len(sections)}")

subheadings = json.loads((ROOT / "src/i18n/termsSubheadings.json").read_text())
assert len(subheadings) == len(sections)
for (_, paragraphs), headings in zip(sections, subheadings):
    assert len(paragraphs) == len(headings)

pdfmetrics.registerFont(TTFont("AutopilotsLogo", str(ROOT / "scripts/assets/Syne-Bold.ttf")))

class BrandWordmark(Flowable):
    def __init__(self):
        Flowable.__init__(self)
        self.font_size = 18
        self.tracking = self.font_size * .19
        self.width = pdfmetrics.stringWidth("AUTOPILOTS", "AutopilotsLogo", self.font_size) + 9 * self.tracking
        self.height = 24
        self.hAlign = "CENTER"
        self.spaceAfter = 18
    def draw(self):
        text = self.canv.beginText(0, 6)
        text.setFont("AutopilotsLogo", self.font_size)
        text.setCharSpace(self.tracking)
        text.setFillColor(HexColor("#102129"))
        text.textOut("AUTOPILOTS")
        self.canv.drawText(text)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
styles = getSampleStyleSheet()
brown, black, muted, soft = HexColor("#9f3826"), HexColor("#111111"), HexColor("#656565"), HexColor("#f5f5f2")
title_style = ParagraphStyle("Title", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=27, leading=31, textColor=black, alignment=TA_CENTER, spaceAfter=12)
subtitle_style = ParagraphStyle("Subtitle", parent=styles["BodyText"], fontName="Helvetica", fontSize=11, leading=16, textColor=muted, alignment=TA_CENTER)
h2_style = ParagraphStyle("H2", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=14, leading=18, textColor=black, spaceBefore=10, spaceAfter=8, keepWithNext=True)
h3_style = ParagraphStyle("H3", parent=styles["Heading3"], fontName="Helvetica-Bold", fontSize=10, leading=14, textColor=black, spaceBefore=8, spaceAfter=4, keepWithNext=True)
body_style = ParagraphStyle("Body", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.2, leading=14, textColor=muted, spaceAfter=8)
notice_style = ParagraphStyle("Notice", parent=body_style, fontName="Helvetica-Bold", textColor=brown, borderColor=brown, borderWidth=0.8, borderPadding=10, backColor=soft, spaceBefore=8, spaceAfter=18)

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(HexColor("#ddddda")); canvas.line(20*mm, 15*mm, 190*mm, 15*mm)
    canvas.setFont("Helvetica", 7.5); canvas.setFillColor(muted)
    canvas.drawString(20*mm, 10*mm, "Autopilots AI Agency LLC - Algemene servicevoorwaarden - versie 1.9")
    canvas.drawRightString(190*mm, 10*mm, f"Pagina {doc.page}")
    canvas.restoreState()

doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=20*mm, bottomMargin=22*mm, title="Algemene servicevoorwaarden Autopilots", author="Autopilots AI Agency LLC")
story = [Spacer(1, 18*mm), BrandWordmark(), Paragraph("Algemene servicevoorwaarden", title_style), Paragraph("Autopilots AI Agency LLC", subtitle_style), Spacer(1, 8*mm), Paragraph("B2B-servicevoorwaarden voor AI-medewerkers, software, implementatie en support.", subtitle_style), Spacer(1, 12*mm), Paragraph("Versie 1.9 &nbsp;&nbsp;|&nbsp;&nbsp; Laatst bijgewerkt: 29 oktober 2026", subtitle_style), Spacer(1, 14*mm), Paragraph("De Nederlandse versie is juridisch leidend. Deze voorwaarden vormen samen met de bestelling, het voorstel of de Statement of Work de overeenkomst.", notice_style), Spacer(1, 22*mm), Paragraph("Autopilots AI Agency LLC<br/>131 Continental Dr, Suite 305<br/>Newark, Delaware 19713, Verenigde Staten<br/>support@auto-pilots.io", subtitle_style), PageBreak()]
for section_index, (title, paragraphs) in enumerate(sections):
    story.append(Paragraph(title, h2_style))
    for paragraph_index, paragraph in enumerate(paragraphs):
        heading = f"{section_index + 1}.{paragraph_index + 1} {subheadings[section_index][paragraph_index]}"
        story.append(Paragraph(heading.replace("&", "&amp;"), h3_style))
        story.append(Paragraph(paragraph.replace("&", "&amp;"), body_style))
    story.append(Spacer(1, 3*mm))

doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUTPUT)
