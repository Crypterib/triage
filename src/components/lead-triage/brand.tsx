import { clsx } from "clsx";

/* ----------------------------------------------------------------------------
 * Brand mark — used in the masthead and the colophon. Three descending
 * bars = the triage funnel. Sharp corners, hand-tuned proportions,
 * currentColor so it inherits whatever the parent asks for.
 * -------------------------------------------------------------------------- */
export function TriageMark({
  className,
  boxed = true,
}: {
  className?: string;
  boxed?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {boxed && (
        <rect
          x="0.5"
          y="0.5"
          width="31"
          height="31"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
        />
      )}
      <rect x="4" y="6" width="24" height="3.2" fill="currentColor" />
      <rect x="4" y="12.5" width="17" height="3.2" fill="currentColor" />
      <rect x="4" y="19" width="9" height="3.2" fill="currentColor" />
      <rect x="4" y="25.5" width="3" height="1.4" fill="currentColor" />
    </svg>
  );
}

/* ----------------------------------------------------------------------------
 * SectionEyebrow — small indexed label like "§ 02 — Triage summary".
 * Editorial, gives the page a sense of structure without being heavy.
 * -------------------------------------------------------------------------- */
export function SectionEyebrow({
  index,
  label,
  className,
}: {
  index?: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={clsx("eyebrow flex items-center gap-2", className)}>
      {index && (
        <span className="font-mono text-[10px] text-[var(--primary)]">
          § {index}
        </span>
      )}
      <span>{label}</span>
      <span className="ml-1 h-px flex-1 bg-[var(--rule)]" />
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * AsciiSpinner — a tiny custom loading indicator. The default lucide
 * spinner is fine but it's the same one every AI-built app uses, so I
 * drew a different one: an asterisk that rotates.
 * -------------------------------------------------------------------------- */
export function AsciiSpinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      aria-hidden="true"
      style={{ animation: "spin 1.2s linear infinite" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="square">
        <line x1="8" y1="2" x2="8" y2="14" />
        <line x1="2" y1="8" x2="14" y2="8" />
        <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" />
        <line x1="12.5" y1="3.5" x2="3.5" y2="12.5" />
      </g>
    </svg>
  );
}
