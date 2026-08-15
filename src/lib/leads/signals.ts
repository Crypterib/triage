// Signal extraction. This is the "interpretation" layer — it turns the
// free-text notes + structured fields into discrete, labelled signals that
// both feed the score and get surfaced in the UI.
//
// Design decision: I went with curated keyword/phrase lists rather than an
// LLM call. Reasons:
//   1. Determinism — running the same export twice gives the same score.
//   2. No API key needed, so the hosted app works on a free Vercel tier.
//   3. The signals are explainable: every chip in the UI maps to a phrase
//      the user can ctrl-F in the original notes.
// Trade-off: it won't catch novel phrasings. That's acceptable for a v1 —
// the keyword lists are easy to extend, and the disqualify/nurture buckets
// absorb anything ambiguous.

import type { CleanedLead, Signal } from "./types";

/* ---------- phrase banks ---------- */
// Each entry is [pattern, label, points]. Patterns are case-insensitive
// substrings. Points are an opinionated weight — strong intent >> pain >>>
// shopping, and disqualifiers are large negatives.

// URGENCY signals are the ones that say "this is happening now" — a decision
// is on the calendar, money is approved, or the buyer is naming a date.
// These are the only signals that can trigger a contact_now recommendation.
const URGENCY: [RegExp, string, number][] = [
  [/budget approved/i, "Budget approved", 28],
  [/decision (this|this )?month/i, "Decision this month", 24],
  [/ready to pilot/i, "Ready to pilot", 22],
  [/keen to move fast/i, "Wants to move fast", 18],
  [/priority (to solve|for the quarter)/i, "Stated priority", 20],
  [/i make the call here/i, "Decision-maker self-identifies", 18],
  [/wants to start asap/i, "Wants to start ASAP", 18],
  [/decision (is )?imminent/i, "Decision imminent", 18],
  [/ready to start/i, "Ready to start", 16],
  [/signing this week/i, "Signing this week", 22],
  [/close this quarter/i, "Closing this quarter", 18],
];

// NEED signals are real pain — the team is bleeding hours — but there's no
// stated decision date. They earn points but cannot on their own trigger
// contact_now. Most of these route to nurture.
const PAIN_PHRASES: [RegExp, string, number][] = [
  [/want[s]? it automated end to end/i, "Wants end-to-end automation", 14],
  [/eating our week/i, "Pain: eating our week", 12],
  [/by hand/i, "Pain: manual work", 10],
  [/manually\b/i, "Pain: manual work", 10],
  [/one by one/i, "Pain: one-by-one", 10],
  [/copy-pasting/i, "Pain: copy-paste", 10],
  [/moving leads between/i, "Pain: lead routing", 8],
  [/chasing follow-ups/i, "Pain: follow-up churn", 10],
  [/flooded shared inbox/i, "Pain: inbox overload", 10],
];

const SHOPPING_PHRASES: [RegExp, string, number][] = [
  [/comparing a few options/i, "Comparing options", 4],
  [/exploring\b/i, "Exploring", 3],
  [/looking into/i, "Looking into", 3],
  [/curious about/i, "Curious", 2],
];

const HESITATION_PHRASES: [RegExp, string, number][] = [
  [/price sensitive/i, "Price sensitive", -10],
  [/not totally sure what we need/i, "Unclear needs", -8],
  [/budget not locked/i, "Budget not locked", -8],
  [/wont share budget/i, "Won't share budget", -6],
  [/depends what you can do/i, "Budget conditional", -6],
  [/tiny budget/i, "Tiny budget", -6],
];

// Hard disqualifiers — if any of these fire, the lead is routed to
// disqualify regardless of score. The phrase "developer looking for a role"
// is the single most common junk pattern in this export.
const DISQUALIFIER_PHRASES: [RegExp, string][] = [
  [/not looking to buy/i, "Explicitly not buying"],
  [/looking for a role/i, "Job seeker"],
  [/attaching my cv/i, "Job seeker (CV)"],
  [/i'm a developer/i, "Developer (job seeker)"],
  [/i'?m a developer looking/i, "Developer (job seeker)"],
  [/cs student/i, "Student"],
  [/final year student/i, "Student"],
  [/just learning/i, "Not a buyer (learning)"],
  [/free template or resources/i, "Freebie seeker"],
  [/journalist writing about/i, "Journalist (not a buyer)"],
  [/looking for a quote/i, "Press inquiry"],
  [/vc here/i, "VC (not a direct buyer)"],
  [/intro you to a few portfolio/i, "VC intro (not a buyer)"],
  [/smm panel/i, "Spam (SMM panel)"],
  [/buy followers/i, "Spam (followers)"],
  [/won \$?1,?000,?000/i, "Spam (lottery scam)"],
  [/cheap smm/i, "Spam"],
  [/dm for rates/i, "Spam"],
  [/can't really pay/i, "No budget"],
  [/cant really pay/i, "No budget"],
  [/no real budget/i, "No budget"],
  [/freelance marketer/i, "Freelancer (low budget)"],
];

/* ---------- title -> authority ---------- */
// Decision-maker titles get the highest weight; senior ops roles are next
// (they often recommend but don't sign); non-buyer titles zero out.
const DECISION_MAKER_RE =
  /\b(ceo|coo|cto|founder|owner|managing director|managing partner)\b/i;
const SENIOR_OPS_RE =
  /\b(vp|head of|director of)\b/i;
const NON_BUYER_TITLE_RE =
  /\b(student|recruiter|developer|journalist|freelancer|intern)\b/i;

/* ---------- main extractor ---------- */
export function extractSignals(lead: CleanedLead): Signal[] {
  const signals: Signal[] = [];
  const notes = lead.notes;

  // ---- notes: urgency (the only signals that can trigger contact_now) ----
  for (const [re, label, pts] of URGENCY) {
    if (re.test(notes)) {
      signals.push({
        kind: "intent_strong",
        label,
        detail: `Notes: "${firstMatch(notes, re)}"`,
        points: pts,
      });
    }
  }

  // ---- notes: need / pain ----
  for (const [re, label, pts] of PAIN_PHRASES) {
    if (re.test(notes)) {
      signals.push({
        kind: "intent_pain",
        label,
        detail: `Notes: "${firstMatch(notes, re)}"`,
        points: pts,
      });
    }
  }

  // ---- notes: shopping ----
  for (const [re, label, pts] of SHOPPING_PHRASES) {
    if (re.test(notes)) {
      signals.push({
        kind: "intent_shopping",
        label,
        detail: `Notes: "${firstMatch(notes, re)}"`,
        points: pts,
      });
    }
  }

  // ---- notes: hesitation ----
  for (const [re, label, pts] of HESITATION_PHRASES) {
    if (re.test(notes)) {
      signals.push({
        kind: "hesitation",
        label,
        detail: `Notes: "${firstMatch(notes, re)}"`,
        points: pts,
      });
    }
  }

  // ---- notes: disqualifiers (huge negative, and also flagged for hard DQ) ----
  for (const [re, label] of DISQUALIFIER_PHRASES) {
    if (re.test(notes)) {
      signals.push({
        kind: "disqualifier",
        label,
        detail: `Notes: "${firstMatch(notes, re)}"`,
        points: -100, // ensures the score floors at 0 and the lead DQs
      });
    }
  }

  // ---- budget signal ----
  const b = lead.budget_monthly_usd;
  if (b !== null) {
    if (b === 0) {
      signals.push({ kind: "budget", label: "Budget: $0", detail: "Explicitly no budget", points: -15 });
    } else if (b < 1000) {
      signals.push({ kind: "budget", label: `Budget: $${b}/mo`, detail: "Below $1k/mo threshold", points: 5 });
    } else if (b < 5000) {
      signals.push({ kind: "budget", label: `Budget: $${b}/mo`, detail: "Mid-tier budget", points: 20 });
    } else if (b < 10000) {
      signals.push({ kind: "budget", label: `Budget: $${b}/mo`, detail: "Strong budget", points: 35 });
    } else {
      signals.push({ kind: "budget", label: `Budget: $${b}/mo`, detail: "Top-tier budget", points: 40 });
    }
  } else if (lead.budget_raw && lead.budget_raw.toLowerCase() === "tbd") {
    signals.push({ kind: "budget", label: "Budget: TBD", detail: "Budget to be defined", points: 8 });
  } else {
    signals.push({ kind: "budget", label: "Budget: unknown", detail: "No budget field provided", points: 5 });
  }

  // ---- authority (title) ----
  if (NON_BUYER_TITLE_RE.test(lead.title)) {
    signals.push({
      kind: "authority",
      label: `Title: ${lead.title || "(empty)"}`,
      detail: "Non-buyer title",
      points: -25,
    });
  } else if (DECISION_MAKER_RE.test(lead.title)) {
    signals.push({
      kind: "authority",
      label: `Title: ${lead.title}`,
      detail: "Decision-maker title",
      points: 30,
    });
  } else if (SENIOR_OPS_RE.test(lead.title)) {
    signals.push({
      kind: "authority",
      label: `Title: ${lead.title}`,
      detail: "Senior ops / recommender",
      points: 20,
    });
  } else if (lead.title) {
    signals.push({
      kind: "authority",
      label: `Title: ${lead.title}`,
      detail: "Mid-tier role",
      points: 10,
    });
  } else {
    signals.push({
      kind: "authority",
      label: "Title: (empty)",
      detail: "No title provided",
      points: 5,
    });
  }

  // ---- company size ----
  const emp = lead.employees_est;
  if (emp !== null) {
    if (emp <= 1) {
      signals.push({ kind: "company", label: `Team: ${emp}`, detail: "Solo / 1-person", points: 0 });
    } else if (emp <= 10) {
      signals.push({ kind: "company", label: `Team: ~${emp}`, detail: "Small team (2-10)", points: 10 });
    } else if (emp <= 50) {
      signals.push({ kind: "company", label: `Team: ~${emp}`, detail: "Mid team (11-50)", points: 18 });
    } else {
      signals.push({ kind: "company", label: `Team: ~${emp}`, detail: "Larger team (50+)", points: 25 });
    }
  } else {
    signals.push({ kind: "company", label: "Team: unknown", detail: "No employee count", points: 4 });
  }

  // ---- source ----
  const sourceScores: Record<string, number> = {
    referral: 22,
    linkedin: 14,
    "cold reply": 12,
    event: 10,
    webform: 8,
    unknown: 4,
    junk: -40,
  };
  const srcPts = sourceScores[lead.source_clean] ?? 6;
  signals.push({
    kind: "source",
    label: `Source: ${lead.source || lead.source_clean}`,
    detail: `Source quality: ${lead.source_clean}`,
    points: srcPts,
  });

  return signals;
}

/* ---------- helpers ---------- */
function firstMatch(text: string, re: RegExp): string {
  const m = text.match(re);
  if (!m) return "";
  // Trim + collapse whitespace for display.
  return m[0].replace(/\s+/g, " ").trim().slice(0, 80);
}
