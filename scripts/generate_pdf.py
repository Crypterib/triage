#!/usr/bin/env python3
"""Generate the one-page Lead Triage documentation PDF.

Voice: informal, Nigerian English, simple words. No big design — just
black on white, plain Helvetica, thin rules. Reads like a developer
jotting down notes for a colleague, not a polished write-up.
"""

import os
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
)
from reportlab.lib.enums import TA_LEFT

# plain black and white palette
INK = colors.HexColor("#000000")
GREY = colors.HexColor("#666666")
LINE = colors.HexColor("#000000")
SOFT = colors.HexColor("#F2F2F2")

OUTPUT_PATH = "/home/z/my-project/download/lead-triage-documentation.pdf"

# styles
title_style = ParagraphStyle(
    "title",
    fontName="Helvetica-Bold",
    fontSize=16,
    leading=19,
    textColor=INK,
    spaceAfter=2,
)

subtitle_style = ParagraphStyle(
    "subtitle",
    fontName="Helvetica",
    fontSize=9,
    leading=11,
    textColor=GREY,
    spaceAfter=10,
)

h2_style = ParagraphStyle(
    "h2",
    fontName="Helvetica-Bold",
    fontSize=10.5,
    leading=13,
    textColor=INK,
    spaceBefore=8,
    spaceAfter=3,
)

body_style = ParagraphStyle(
    "body",
    fontName="Helvetica",
    fontSize=8.8,
    leading=11.8,
    textColor=INK,
    alignment=TA_LEFT,
    spaceAfter=4,
)

# content
story = []

# Header
story.append(Paragraph("Lead Triage — how it works", title_style))
story.append(Paragraph(
    "A short note on what I built, how it works, and why I made some of the calls I made.",
    subtitle_style,
))

# Thin black rule
rule = Table([[""]], colWidths=[170 * mm], rowHeights=[0.5])
rule.setStyle(TableStyle([("LINEABOVE", (0, 0), (-1, -1), 0.6, LINE)]))
story.append(rule)
story.append(Spacer(1, 6))

# Overview
story.append(Paragraph("What this thing does", h2_style))
story.append(Paragraph(
    "You drop a CSV of inbound leads inside — contact details, company info, and the "
    "free-text notes from previous chats. The system gives you back a ranked shortlist "
    "with three buckets: <b>contact now</b>, <b>nurture</b>, and <b>disqualify</b>. "
    "It runs as a Next.js app. You put the CSV in the upload box, you get a scored "
    "table back. The sample export (520 rows) runs in about 200ms on the server. "
    "No need to look at anything by hand.",
    body_style,
))

# Architecture
story.append(Paragraph("How I built it", h2_style))
story.append(Paragraph(
    "It is a single-page Next.js 16 + TypeScript app on Vercel. The flow is simple: "
    "<font face=\"Courier\">CSV → POST /api/triage → JSON → table</font>. No database, "
    "no login, no external API calls. Everything runs on the free Vercel tier. The "
    "scoring logic sits in <font face=\"Courier\">src/lib/leads/</font> as plain "
    "functions inside four files: <font face=\"Courier\">cleaners.ts</font> handles "
    "date, employee, budget and ID normalisation; <font face=\"Courier\">signals.ts</font> "
    "holds the phrase-banks and signal extractor; <font face=\"Courier\">score.ts</font> "
    "has the decision rules; <font face=\"Courier\">triage.ts</font> is the orchestrator "
    "that ties everything together. Every weight is a named constant, so you can check "
    "and tune it yourself.",
    body_style,
))
story.append(Paragraph(
    "<b>How you use it:</b> 1) Click <i>Use sample data</i> or upload your CSV. "
    "2) The server parses, cleans, scores and ranks every lead. 3) The UI shows the "
    "ranked table — contact now on top, sorted by score. 4) Filter by status, source, "
    "or just search by text. 5) Click any row to see the full signal breakdown and the "
    "original notes. 6) Click Export to download the triaged list as a CSV, with the "
    "top signals per lead.",
    body_style,
))

# Qualification logic
story.append(Paragraph("What counts as worth contacting now", h2_style))
story.append(Paragraph(
    "A lead is <b>contact now</b> only if it has a clear <b>urgency signal</b> in the "
    "notes <i>and</i> a score of 65 or above. Urgency signals are phrases like "
    "<i>budget approved</i>, <i>decision this month</i>, <i>ready to pilot</i>, "
    "<i>I make the call here</i>, <i>keen to move fast</i>. The score is just a sum of "
    "weighted signals:",
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
    ("BACKGROUND", (0, 0), (-1, 0), INK),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, 0), 8),
    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
    ("FONTSIZE", (0, 1), (-1, -1), 7.8),
    ("TEXTCOLOR", (0, 1), (-1, -1), INK),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT]),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ("TOPPADDING", (0, 0), (-1, -1), 3),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ("LINEBELOW", (0, 0), (-1, 0), 0.4, LINE),
    ("GRID", (0, 1), (-1, -1), 0.25, LINE),
]))
story.append(signals_table)
story.append(Spacer(1, 4))
story.append(Paragraph(
    "On the sample export of 520 leads: <b>100 contact now</b> (19%), "
    "<b>245 nurture</b> (47%), <b>175 disqualify</b> (34%). Average score 57.4, median 64.",
    body_style,
))

# Assumptions + trade-offs in two columns
assumptions_html = (
    "<b>Some of the calls I made</b><br/>"
    "• The CSV format from the brief is what I treated as the standard input. Any "
    "future export with the same columns will just work.<br/>"
    "• If somebody says comparing options but there is no urgency signal, I put "
    "them in nurture, not contact now. It could go either way, but I chose the "
    "careful side.<br/>"
    "• VC here — wanting to intro portfolio companies — disqualifies. They are not "
    "the buyer.<br/>"
    "• Date <font face=\"Courier\">04-06-2024</font> I read as D-M-Y, because I "
    "checked it against 19-06-2024 and 26-06-2024 rows in the export.<br/>"
    "• For budget range like 5k-7k I use the lower bound ($5k). Just to be safe."
)

tradeoffs_html = (
    "<b>Trade-offs I am okay with</b><br/>"
    "• <b>Rules over LLM.</b> Same CSV always gives the same output, no API key, "
    "and every signal shows in the UI so you can see why. The flip side: it will not "
    "catch new phrasings — the keyword lists will need small tuning from time to "
    "time.<br/>"
    "• <b>Contact-now is tight on purpose.</b> Budget and title alone is not enough "
    "— too many comparing-options leads have those. Asking for an urgency phrase "
    "keeps the list at about 19% of inbound, which a rep can actually work through "
    "in a week.<br/>"
    "• <b>Disqualify is not permanent.</b> Leads stay in the export, they just get "
    "flagged. Easy to override.<br/>"
    "• <b>Every signal is shown in the UI</b>, not just the score. So the rep can "
    "audit and override. The score is a starting point, not a final verdict."
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

# build
doc = SimpleDocTemplate(
    OUTPUT_PATH,
    pagesize=A4,
    leftMargin=20 * mm,
    rightMargin=20 * mm,
    topMargin=15 * mm,
    bottomMargin=15 * mm,
    title="Lead Triage — how it works",
    author="Crypterib",
    subject="Lead triage system documentation",
    creator="Crypterib",
)
doc.build(story)
print(f"PDF generated: {OUTPUT_PATH}")
print(f"Size: {os.path.getsize(OUTPUT_PATH)} bytes")
