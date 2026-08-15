"use client";

import type { LeadStatus, Signal, ScoredLead } from "@/lib/leads";

/* ---------- status helpers ---------- */
export const STATUS_LABEL: Record<LeadStatus, string> = {
  contact_now: "Contact now",
  nurture: "Nurture",
  disqualify: "Disqualify",
};

export const STATUS_SHORT: Record<LeadStatus, string> = {
  contact_now: "GO",
  nurture: "HOLD",
  disqualify: "NO",
};

/* ---------- StatusBadge ---------- */
export function StatusBadge({ status }: { status: LeadStatus }) {
  const cls = {
    contact_now: "bg-[var(--status-go-bg)] text-[var(--status-go)] border-[var(--status-go)]/30",
    nurture: "bg-[var(--status-hold-bg)] text-[var(--status-hold)] border-[var(--status-hold)]/30",
    disqualify: "bg-[var(--status-no-bg)] text-[var(--status-no)] border-[var(--status-no)]/30",
  }[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

/* ---------- ScoreBar ---------- */
export function ScoreBar({ score, status }: { score: number; status: LeadStatus }) {
  const color = {
    contact_now: "var(--status-go)",
    nurture: "var(--status-hold)",
    disqualify: "var(--status-no)",
  }[status];
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-7 text-right font-mono text-xs tabular-nums text-foreground">
        {score}
      </span>
    </div>
  );
}

/* ---------- SignalChip ---------- */
const SIGNAL_KIND_STYLES: Record<Signal["kind"], string> = {
  intent_strong: "bg-[var(--status-go-bg)] text-[var(--status-go)]",
  intent_pain: "bg-orange-50 text-orange-800 border-orange-200",
  intent_shopping: "bg-stone-100 text-stone-700 border-stone-200",
  hesitation: "bg-amber-50 text-amber-800 border-amber-200",
  disqualifier: "bg-red-50 text-red-800 border-red-200",
  budget: "bg-stone-100 text-stone-700 border-stone-200",
  authority: "bg-stone-100 text-stone-700 border-stone-200",
  company: "bg-stone-100 text-stone-700 border-stone-200",
  source: "bg-stone-100 text-stone-700 border-stone-200",
};

export function SignalChip({ signal }: { signal: Signal }) {
  const cls = SIGNAL_KIND_STYLES[signal.kind];
  const sign = signal.points > 0 ? "+" : "";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium ${cls}`}
      title={signal.detail}
    >
      {signal.label}
      <span className="font-mono opacity-60">
        {sign}
        {signal.points}
      </span>
    </span>
  );
}

/* ---------- LeadDetail (expanded row content) ---------- */
export function LeadDetail({ lead }: { lead: ScoredLead }) {
  return (
    <div className="grid gap-6 bg-stone-50/50 p-5 md:grid-cols-[1fr_1fr]">
      {/* Left column: notes + reason */}
      <div className="space-y-4">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recommendation
          </div>
          <p className="text-sm text-foreground">{lead.recommendation_reason}</p>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Original notes
          </div>
          <p className="rounded border border-border bg-white p-3 text-sm leading-relaxed text-foreground">
            {lead.notes || <span className="italic text-muted-foreground">(no notes)</span>}
          </p>
        </div>
      </div>

      {/* Right column: signals + cleaned fields */}
      <div className="space-y-4">
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Score breakdown ({lead.score} total)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lead.signals.map((s, i) => (
              <SignalChip key={i} signal={s} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <DetailField label="Lead ID" value={lead.lead_id} />
          <DetailField label="Created (raw)" value={lead.created_raw} />
          <DetailField label="Created (ISO)" value={lead.created_iso ?? "—"} />
          <DetailField label="Email" value={lead.email || "—"} valid={lead.email_valid} />
          <DetailField label="Company" value={lead.company || "—"} />
          <DetailField label="Team size" value={lead.employees_raw || "—"} />
          <DetailField label="Team (parsed)" value={lead.employees_est?.toString() ?? "—"} />
          <DetailField label="Website" value={lead.website_normalized || "—"} />
          <DetailField label="Title" value={lead.title || "—"} />
          <DetailField label="Source" value={lead.source || "—"} />
          <DetailField label="Budget (raw)" value={lead.budget_raw || "—"} />
          <DetailField
            label="Budget (parsed)"
            value={lead.budget_monthly_usd ? `$${lead.budget_monthly_usd}/mo` : "—"}
          />
        </div>
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  valid,
}: {
  label: string;
  value: string;
  valid?: boolean;
}) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div
        className={`font-mono text-foreground ${
          valid === false ? "text-red-700" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
