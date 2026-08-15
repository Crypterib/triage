// Core types for the lead-triage pipeline.
// Kept intentionally flat — every field here is something the UI or the
// scoring function actually reads. No abstract base classes, no inheritance.

export type LeadStatus = "contact_now" | "nurture" | "disqualify";

export type SignalKind =
  | "intent_strong"
  | "intent_pain"
  | "intent_shopping"
  | "hesitation"
  | "disqualifier"
  | "budget"
  | "authority"
  | "company"
  | "source";

export interface Signal {
  kind: SignalKind;
  label: string;
  // Why this signal fired — a short human-readable reason.
  // Surfaced directly in the UI so the assessor can audit the score.
  detail: string;
  // Point contribution to the final score (can be negative).
  points: number;
}

export interface CleanedLead {
  lead_id: string;
  created_iso: string | null; // ISO date or null if unparseable
  created_raw: string;
  name: string;
  email: string;
  email_valid: boolean;
  company: string;
  employees_est: number | null; // midpoint of a range, parsed number, or null
  employees_raw: string;
  website: string;
  website_normalized: string;
  title: string;
  source: string;
  source_clean: string; // canonical source or "unknown" / "junk"
  budget_monthly_usd: number | null;
  budget_raw: string;
  notes: string;
}

export interface ScoredLead extends CleanedLead {
  score: number; // 0-100
  status: LeadStatus;
  signals: Signal[];
  recommendation_reason: string;
  rank: number; // 1-based, within status group
}

export interface TriageResult {
  leads: ScoredLead[];
  summary: {
    total: number;
    contact_now: number;
    nurture: number;
    disqualify: number;
    avg_score: number;
    median_score: number;
    by_source: Record<string, number>;
  };
  meta: {
    parsed_rows: number;
    skipped_rows: number;
    generated_at: string;
  };
}
