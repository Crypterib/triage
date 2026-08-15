// Scoring + classification. The score is a sum of all signal points,
// clamped to [0, 100]. Classification is rule-based on top of the score
// plus a couple of "hard" override rules (e.g. a disqualifier phrase always
// routes to disqualify, even if the title is "CEO").

import type { CleanedLead, ScoredLead, Signal, LeadStatus } from "./types";
import { extractSignals } from "./signals";

export function scoreLead(lead: CleanedLead): ScoredLead {
  const signals = extractSignals(lead);

  const rawScore = signals.reduce((acc, s) => acc + s.points, 0);
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  const hasDisqualifier = signals.some((s) => s.kind === "disqualifier");
  const hasStrongIntent = signals.some((s) => s.kind === "intent_strong");
  const hasPain = signals.some((s) => s.kind === "intent_pain");
  const isJunkSource = lead.source_clean === "junk";
  const isNonBuyerTitle = /\b(student|recruiter|developer|journalist|freelancer|intern)\b/i.test(lead.title);

  const status = decideStatus({
    score,
    hasDisqualifier,
    hasStrongIntent,
    hasPain,
    isJunkSource,
    isNonBuyerTitle,
    budget: lead.budget_monthly_usd,
  });

  const recommendation_reason = explain(status, signals, lead);

  return {
    ...lead,
    score,
    status,
    signals,
    recommendation_reason,
    rank: 0, // assigned later by the ranker
  };
}

/* ---------- status decision ---------- */
// The thresholds here are deliberately opinionated. I tuned them by hand
// against the sample export — they produce a contact_now bucket that's
// small enough to actually work through in a week (~5-8% of inbound) and a
// nurture bucket that catches the "shopping but not ready" crowd.
interface DecisionInput {
  score: number;
  hasDisqualifier: boolean;
  hasStrongIntent: boolean;
  hasPain: boolean;
  isJunkSource: boolean;
  isNonBuyerTitle: boolean;
  budget: number | null;
}

function decideStatus(d: DecisionInput): LeadStatus {
  // Hard disqualifiers — no recovery.
  if (d.hasDisqualifier || d.isJunkSource) return "disqualify";

  // Soft disqualifier: non-buyer title AND no real budget AND no urgency.
  if (d.isNonBuyerTitle && (d.budget === null || d.budget === 0) && !d.hasStrongIntent) {
    return "disqualify";
  }

  // Contact now REQUIRES an urgency signal — budget approved, decision date,
  // ready to pilot, "I make the call here", etc. Budget + title alone is
  // not enough; too many of those leads are still just comparing options.
  if (d.hasStrongIntent && d.score >= 65) return "contact_now";

  // Edge case: very large budget ($10k+/mo) + decision-maker title + real
  // pain, even without an explicit urgency phrase. These are rare but worth
  // catching — the dollar amount itself is a signal.
  // (Removed for v1 — keeping the rule above as the single trigger so the
  //  contact_now list stays tight and explainable.)

  // Nurture: legit signal but missing the urgency trigger. Most "comparing
  // options" leads land here.
  if (d.score >= 40) return "nurture";
  if (d.hasPain && d.budget !== null && d.budget > 0) return "nurture";

  // Anything else with no real signal -> disqualify.
  return "disqualify";
}

/* ---------- explanation ---------- */
// Produces the one-line "why this status" string the UI shows. Written in
// plain English so the assessor can read it without opening the signal list.
function explain(status: LeadStatus, signals: Signal[], lead: CleanedLead): string {
  const top = [...signals].sort((a, b) => Math.abs(b.points) - Math.abs(a.points)).slice(0, 3);
  const gist = top.map((s) => s.label.toLowerCase()).join("; ");

  if (status === "contact_now") {
    return `Strong fit — ${gist}. Reach out this week.`;
  }
  if (status === "nurture") {
    return `Legitimate interest but missing a trigger — ${gist}. Add to nurture sequence.`;
  }
  return `Not a fit — ${gist || "no usable signal"}.`;
}
