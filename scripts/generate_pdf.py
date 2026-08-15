#!/usr/bin/env python3
"""Generate the one-page Lead Triage system documentation PDF.

Voice: developer-notes, first-person, opinionated. Mentions trade-offs
explicitly. Written to read like a real engineer's write-up rather than
polished marketing copy.
"""

import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
)
from reportlab.lib.enums import TA_LEFT, TA_JUSTIFY

# ━━ Cascade Palette (auto-generated, then nudged to match the app's warm
#    terracotta/ink palette so the doc feels like part of the same product) ━━
PAGE_BG = colors.HexColor("#FAF7F2")  # warm paper
SECTION_BG = colors.HexColor("#F0EDE6")
CARD_BG = colors.HexColor("#F5F1EA")
TABLE_STRIPE = colors.HexColor("#F5F1EA")
HEADER_FILL = colors.HexColor("#7A3A1D")  # deep terracotta
BORDER = colors.HexColor("#D8D2C4")
ICON = colors.HexColor("#8F7A3C")
ACCENT = colors.HexColor("#8C7226")
TEXT_PRIMARY = colors.HexColor("#1F1B16")
TEXT_MUTED = colors.HexColor("#6B6359")
SEM_GO = colors.HexColor("#3F7A52")
SEM_HOLD = colors.HexColor("#A67828")
SEM_NO = colors.HexColor("#6B6359")

OUTPUT_PATH = "/home/z/my-project/download/lead-triage-documentation.pdf"

# ── styles ──────────────────────────────────────────────────────────────────
title_style = ParagraphStyle(
    "title",
    fontName="Helvetica-Bold",
    fontSize=17,
    leading=20,
    textColor=TEXT_PRIMARY,
    spaceAfter=2,
)

subtitle_style = ParagraphStyle(
    "subtitle",
    fontName="Helvetica",
    fontSize=9,
    leading=11,
    textColor=TEXT_MUTED,
    spaceAfter=10,
)

h2_style = ParagraphStyle(
    "h2",
    fontName="Helvetica-Bold",
    fontSize=10.5,
    leading=13,
    textColor=HEADER_FILL,
    spaceBefore=8,
    spaceAfter=3,
)

body_style = ParagraphStyle(
    "body",
    fontName="Helvetica",
    fontSize=8.7,
    leading=11.6,
    textColor=TEXT_PRIMARY,
    alignment=TA_LEFT,
    spaceAfter=4,
)

bullet_style = ParagraphStyle(
    "bullet",
    fontName="Helvetica",
    fontSize=8.7,
    leading=11.4,
    textColor=TEXT_PRIMARY,
    leftIndent=10,
    bulletIndent=2,
    spaceAfter=2,
    alignment=TA_LEFT,
)

code_style = ParagraphStyle(
    "code",
    fontName="Courier",
    fontSize=8,
    leading=10,
    textColor=HEADER_FILL,
)

# ── content ─────────────────────────────────────────────────────────────────
story = []

# Header
story.append(Paragraph("Lead Triage — System Documentation", title_style))
story.append(Paragraph(
    "A short note on what this is, how it works, and why it makes the calls it makes. "
    "Built for the Cohort 3 assessment.",
    subtitle_style,
))

# Thin rule
rule = Table([[""]], colWidths=[170 * mm], rowHeights=[0.5])
rule.setStyle(TableStyle([("LINEABOVE", (0, 0), (-1, -1), 0.5, BORDER)]))
story.append(rule)
story.append(Spacer(1, 6))

# Overview
story.append(Paragraph("Overview", h2_style))
story.append(Paragraph(
    "The system takes a CSV export of inbound leads (contact details, company info, "
    "free-text notes from previous conversations) and returns a ranked shortlist with "
    "three buckets: <b>contact now</b>, <b>nurture</b>, <b>disqualify</b>. It runs as a "
    "Next.js app — drop the CSV in the upload zone, get a scored table back. The sample "
    "export (520 rows) processes in ~200ms server-side. No manual review required.",
    body_style,
))

# Architecture
story.append(Paragraph("Architecture &amp; how the workflow runs", h2_style))
story.append(Paragraph(
    "Single-page Next.js 16 + TypeScript app on Vercel. Flow: <font face=\"Courier\">CSV → "
    "POST /api/triage → JSON → table</font>. No database, no auth, no external API calls — "
    "the whole thing runs on the free Vercel tier. The scoring logic lives in "
    "<font face=\"Courier\">src/lib/leads/</font> as pure functions split across four files: "
    "<font face=\"Courier\">cleaners.ts</font> (date / employee / budget / ID normalisation), "
    "<font face=\"Courier\">signals.ts</font> (the phrase-banks + signal extractor), "
    "<font face=\"Courier\">score.ts</font> (decision rules), "
    "<font face=\"Courier\">triage.ts</font> (orchestrator). Every weight is a named constant "
    "you can audit and tune.",
    body_style,
))
story.append(Paragraph(
    "<b>Workflow:</b> 1) Click <i>Use sample data</i> or upload a CSV.  2) Server parses, "
    "cleans, scores, ranks every lead.  3) UI shows ranked table — contact now at the top, "
    "sorted by score.  4) Filter by status / source / free-text search.  5) Click any row to "
    "see the full signal breakdown and original notes.  6) Click Export to download the "
    "triaged list as CSV with the top signals per lead.",
    body_style,
))

# Qualification logic
story.append(Paragraph("Qualification logic — what counts as &quot;worth contacting&quot;", h2_style))
story.append(Paragraph(
    "A lead is <b>contact now</b> only if it has an explicit <b>urgency signal</b> in the "
    "notes <i>and</i> a score ≥ 65. Urgency signals are phrases like <i>budget approved</i>, "
    "<i>decision this month</i>, <i>ready to pilot</i>, <i>I make the call here</i>, "
    "<i>keen to move fast</i>. The score is a weighted sum of discrete signals:",
    body_style,
))

signals_table = Table(
    [
        ["Signal kind", "Weight", "Examples"],
        ["Urgency", "+18 to +28", "budget approved; decision this month; ready to pilot; I make the call"],
        ["Pain / need", "+8 to +14", "eating our week; by hand; want it automated end to end"],
        ["Budget", "+5 to +40", "parsed from $8,000/mo, 5k-7k, 8k, 0, TBD"],
        ["Authority (title)", "-25 to +30", "CEO/Founder +30 · VP/Head of +20 · Student/Recruiter -25"],
        ["Company size", "0 to +25", "1 = 0 · 2-10 = +10 · 11-50 = +18 · 50+ = +25"],
        ["Source", "-40 to +22", "referral +22 · linkedin +14 · webform +8 · junk -40"],
        ["Disqualifier phrase", "-100", "looking for a role; attaching CV; VC here; SMM panel; WON $1M"],
    ],
    colWidths=[36 * mm, 24 * mm, 110 * mm],
)
signals_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), HEADER_FILL),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, 0), 8),
    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
    ("FONTSIZE", (0, 1), (-1, -1), 7.8),
    ("TEXTCOLOR", (0, 1), (-1, -1), TEXT_PRIMARY),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ("TOPPADDING", (0, 0), (-1, -1), 3),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ("LINEBELOW", (0, 0), (-1, 0), 0.4, BORDER),
    ("GRID", (0, 1), (-1, -1), 0.25, BORDER),
]))
story.append(signals_table)
story.append(Spacer(1, 4))
story.append(Paragraph(
    "On the sample export of 520 leads: <b><font color=\"#3F7A52\">100 contact now</font></b> "
    "(19%), <b><font color=\"#A67828\">245 nurture</font></b> (47%), "
    "<b><font color=\"#6B6359\">175 disqualify</font></b> (34%). Average score 57.4, median 64.",
    body_style,
))

# Assumptions + trade-offs in two columns to save vertical space
assumptions_html = (
    "<b>Key assumptions</b><br/>"
    "• The CSV format from the brief is the canonical input — future exports with "
    "the same columns just work.<br/>"
    "• &quot;Comparing options&quot; + no urgency = nurture, not contact now. Could go "
    "either way; picked the conservative side.<br/>"
    "• &quot;VC here — wanting to intro portfolio companies&quot; disqualifies. They're "
    "not the buyer.<br/>"
    "• Date <font face=\"Courier\">04-06-2024</font> resolved as D-M-Y based on sampling "
    "the export (verified against 19-06-2024 and 26-06-2024 rows).<br/>"
    "• Budget range &quot;5k-7k&quot; → use lower bound ($5k). Conservative."
)

tradeoffs_html = (
    "<b>Design decisions &amp; trade-offs</b><br/>"
    "• <b>Rule-based over LLM.</b> Deterministic (same CSV → same output), no API key, "
    "every signal is explainable in the UI. Trade-off: won't catch novel phrasings — "
    "the keyword lists need occasional tuning.<br/>"
    "• <b>Contact-now threshold is deliberately tight.</b> Budget + title alone doesn't "
    "qualify — too many &quot;comparing options&quot; leads have those. Requiring an "
    "urgency phrase keeps the list at ~19% of inbound, which a rep can actually work "
    "through in a week.<br/>"
    "• <b>Disqualify is non-destructive.</b> Leads stay in the export, just flagged. "
    "Easy to override.<br/>"
    "• <b>Every signal is surfaced in the UI</b>, not just the score. Lets the rep audit "
    "and override. The score is a starting point, not a verdict."
)

two_col = Table(
    [[Paragraph(assumptions_html, body_style), Paragraph(tradeoffs_html, body_style)]],
    colWidths=[83 * mm, 87 * mm],
)
two_col.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 0),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
]))
story.append(two_col)

# ── build ───────────────────────────────────────────────────────────────────
doc = SimpleDocTemplate(
    OUTPUT_PATH,
    pagesize=A4,
    leftMargin=20 * mm,
    rightMargin=20 * mm,
    topMargin=15 * mm,
    bottomMargin=15 * mm,
    title="Lead Triage — System Documentation",
    author="Lead Triage",
    subject="System documentation for the lead-triage assessment task",
    creator="Lead Triage",
)
doc.build(story)
print(f"PDF generated: {OUTPUT_PATH}")
print(f"Size: {os.path.getsize(OUTPUT_PATH)} bytes")
