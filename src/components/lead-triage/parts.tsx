"use client";

import type { LeadStatus, Signal, ScoredLead } from "@/lib/leads";
import { clsx } from "clsx";

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
/* Sharp 2px corners, mono prefix tag, no rounded-full pill. Reads
   more like a stamp than a tag. */
export function StatusBadge({ status }: { status: LeadStatus }) {
  const cls = {
    contact_now:
      "bg-[var(--status-go-bg)] text-[var(--status-go)] border-[var(--status-go)]/40",
    nurture:
      "bg-[var(--status-hold-bg)] text-[var(--status-hold)] border-[var(--status-hold)]/40",
    disqualify:
      "bg-[var(--status-no-bg)] text-[var(--status-no)] border-[var(--status-no)]/40",
  }[status];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 border px-2 py-[3px] text-[11px] font-medium uppercase tracking-wide",
        cls
      )}
    >
      <span className="font-mono text-[9px] opacity-70">
        {STATUS_SHORT[status]}
      </span>
      <span>{STATUS_LABEL[status]}</span>
    </span>
  );
}

/* ---------- ScoreBar ---------- */
/* Wider track, mono number, animated fill on mount. The number sits
   to the right of the bar — same column for all rows so they align. */
export function ScoreBar({
  score,
  status,
  animate = true,
}: {
  score: number;
  status: LeadStatus;
  animate?: boolean;
}) {
  const color = {
    contact_now: "var(--status-go)",
    nurture: "var(--status-hold)",
    disqualify: "var(--status-no)",
  }[status];
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-[6px] w-20 overflow-hidden bg-muted">
        <div
          className={clsx(
            "absolute inset-y-0 left-0",
            animate && "score-fill"
          )}
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-8 text-right font-mono text-xs tabular-nums text-foreground">
        {score}
      </span>
    </div>
  );
}

/* ---------- SignalChip ---------- */
/* Square corners, denser, kind-prefix in mono. Sign in muted mono so
   the chip reads as data, not as decoration. */
const SIGNAL_KIND_STYLES: Record<Signal["kind"], { cls: string; tag: string }> =
  {
    intent_strong: {
      cls: "bg-[var(--status-go-bg)] text-[var(--status-go)] border-[var(--status-go)]/30",
      tag: "URG",
    },
    intent_pain: {
      cls: "bg-orange-50 text-orange-900 border-orange-200",
      tag: "PAIN",
    },
    intent_shopping: {
      cls: "bg-stone-100 text-stone-800 border-stone-200",
      tag: "SHOP",
    },
    hesitation: {
      cls: "bg-[var(--status-hold-bg)] text-[var(--status-hold)] border-[var(--status-hold)]/30",
      tag: "HES",
    },
    disqualifier: {
      cls: "bg-red-50 text-red-900 border-red-200",
      tag: "DQ",
    },
    budget: {
      cls: "bg-stone-100 text-stone-800 border-stone-200",
      tag: "BUD",
    },
    authority: {
      cls: "bg-stone-100 text-stone-800 border-stone-200",
      tag: "AUTH",
    },
    company: {
      cls: "bg-stone-100 text-stone-800 border-stone-200",
      tag: "TEAM",
    },
    source: {
      cls: "bg-stone-100 text-stone-800 border-stone-200",
      tag: "SRC",
    },
  };

export function SignalChip({ signal }: { signal: Signal }) {
  const { cls, tag } = SIGNAL_KIND_STYLES[signal.kind];
  const sign = signal.points > 0 ? "+" : "";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 border px-1.5 py-[2px] text-[11px] font-medium",
        cls
      )}
      title={signal.detail}
    >
      <span className="font-mono text-[9px] opacity-60">{tag}</span>
      <span>{signal.label}</span>
      <span className="font-mono opacity-70">
        {sign}
        {signal.points}
      </span>
    </span>
  );
}

/* ---------- LeadDetail (expanded row content) ---------- */
/* Two-column layout. Left: notes + recommendation. Right: signal
   breakdown + cleaned fields. Different background to visually
   distinguish from the row above. */
export function LeadDetail({ lead }: { lead: ScoredLead }) {
  return (
    <div className="grid gap-px bg-[var(--rule)] md:grid-cols-[1fr_1fr]">
      {/* Left column */}
      <div className="space-y-5 bg-stone-50/70 p-5">
        <div>
          <div className="eyebrow mb-2">Recommendation</div>
          <p className="text-sm leading-relaxed text-foreground">
            {lead.recommendation_reason}
          </p>
        </div>
        <div>
          <div className="eyebrow mb-2">Original notes</div>
          <p className="border-l-2 border-[var(--primary)]/60 bg-white p-3 text-sm leading-relaxed text-foreground">
            {lead.notes || (
              <span className="italic text-muted-foreground">(no notes)</span>
            )}
          </p>
        </div>
      </div>

      {/* Right column */}
      <div className="space-y-5 bg-white p-5">
        <div>
          <div className="eyebrow mb-2">
            Score breakdown · {lead.score} total
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lead.signals.map((s, i) => (
              <SignalChip key={i} signal={s} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
          <DetailField label="Lead ID" value={lead.lead_id} />
          <DetailField label="Created (raw)" value={lead.created_raw} />
          <DetailField label="Created (ISO)" value={lead.created_iso ?? "—"} />
          <DetailField
            label="Email"
            value={lead.email || "—"}
            valid={lead.email_valid}
          />
          <DetailField label="Company" value={lead.company || "—"} />
          <DetailField label="Team size" value={lead.employees_raw || "—"} />
          <DetailField
            label="Team (parsed)"
            value={lead.employees_est?.toString() ?? "—"}
          />
          <DetailField
            label="Website"
            value={lead.website_normalized || "—"}
          />
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
      <div className="eyebrow mb-0.5">{label}</div>
      <div
        className={clsx(
          "font-mono text-foreground",
          valid === false && "text-red-700"
        )}
      >
        {value}
      </div>
    </div>
  );
}
