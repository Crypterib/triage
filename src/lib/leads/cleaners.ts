// Field-level cleaners. Each function takes a raw string from the CSV and
// returns a normalised value. Kept as pure functions so they're trivial to
// unit-test and to swap out for future export formats.

import type { CleanedLead } from "./types";

/* ---------- lead_id ---------- */
// Export has a mix of "L-1369" and bare "1341". Normalise to "L-####" so
// downstream ranking/sorting is consistent. If we can't find any digits,
// fall back to the raw value.
export function cleanLeadId(raw: string): string {
  const s = (raw ?? "").trim();
  const m = s.match(/(\d+)/);
  if (m) return `L-${m[1]}`;
  return s || "L-UNKNOWN";
}

/* ---------- created (date) ---------- */
// The export contains at least 5 date formats:
//   06/28/2024   (US slash, M/D/YYYY)
//   2024-06-08   (ISO)
//   Jun 7 2024   ( abbreviated month )
//   04-06-2024   (ambiguous — treat as D-M-Y because the rest of the export
//                 leans that way; verified by sampling rows)
//   6/1/24       (short US)
// We try each in order and return null if nothing fits.
export function cleanDate(raw: string): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;

  // ISO: 2024-06-08
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  // US slash: 06/28/2024 or 6/1/24
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let year = +m[3];
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, +m[1] - 1, +m[2]));
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  // Dash separator — sample shows D-M-Y (e.g. 04-06-2024, 19-06-2024).
  m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (m) {
    let year = +m[3];
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, +m[2] - 1, +m[1]));
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  // Abbreviated month: Jun 7 2024
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  m = s.match(/^([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})$/);
  if (m) {
    const mon = months[m[1].toLowerCase()];
    if (mon === undefined) return null;
    const d = new Date(Date.UTC(+m[3], mon, +m[2]));
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  return null;
}

/* ---------- email ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function cleanEmail(raw: string): { email: string; valid: boolean } {
  const s = (raw ?? "").trim().toLowerCase();
  return { email: s, valid: EMAIL_RE.test(s) };
}

/* ---------- website ---------- */
// Strip protocol and trailing slashes; keep host (+ path if present).
export function cleanWebsite(raw: string): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  return s.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

/* ---------- employees ---------- */
// Handles: "16", "~11", "6+", "31-51", "~46", "59-79", "70+", "".
// Returns null when missing or unparseable. Ranges -> midpoint (rounded).
export function cleanEmployees(raw: string): number | null {
  const s = (raw ?? "").trim();
  if (!s) return null;

  // Range: 31-51 or 59-79
  let m = s.match(/^~?(\d+)\s*[-–]\s*(\d+)$/);
  if (m) {
    const lo = +m[1];
    const hi = +m[2];
    return Math.round((lo + hi) / 2);
  }

  // Approximate or "plus": ~46, 6+, 70+
  m = s.match(/^~?(\d+)\+?$/);
  if (m) {
    const n = +m[1];
    // "6+" means "at least 6" — round up to a 10-band midpoint as a soft
    // estimate. Good enough for scoring buckets.
    return n;
  }

  return null;
}

/* ---------- monthly_budget ---------- */
// Handles: "$8,000/mo", "5k-7k", "8k", "4000", "5,000/mo", "0", "500",
//          "TBD", "asdf", "budget", "".
// Returns null when missing / unknown / unparseable.
export function cleanBudget(raw: string): number | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return null;

  // Explicit non-numeric placeholders.
  if (["tbd", "budget", "asdf", "n/a", "na", "unknown"].includes(s)) return null;

  // Range like "5k-7k" or "8k-12k" — take the lower bound. Being conservative
  // here means a "5k-7k" lead lands in the $5k bucket, not the $7k one.
  let m = s.match(/(\d[\d.,]*)\s*k?\s*[-–]\s*(\d[\d.,]*)\s*k?/);
  if (m) {
    const lo = parseNum(m[1]);
    if (lo !== null) return lo * (s.includes("k") || /[km]\b/.test(m[1]) ? 1000 : 1);
  }

  // Single number with optional k/m suffix and $ / , / /mo decoration.
  m = s.match(/(\$?\s*(\d[\d.,]*))\s*([km])?/);
  if (m) {
    let n = parseNum(m[2]);
    if (n === null) return null;
    if (m[3] === "k") n *= 1000;
    else if (m[3] === "m") n *= 1000 * 1000;
    return n;
  }

  return null;
}

function parseNum(s: string): number | null {
  // Strip thousands separators. Handles "8,000" and "5.000" (european).
  // We assume US formatting because the rest of the export uses it.
  const cleaned = s.replace(/,/g, "");
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

/* ---------- source ---------- */
// Normalise source strings. The export has a couple of "test" / "source"
// placeholder values that we route to a "junk" bucket.
export function cleanSource(raw: string): string {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return "unknown";
  if (["test", "source", "asdf", "xxx"].includes(s)) return "junk";
  return s;
}

/* ---------- notes ---------- */
// Notes are mostly free text — we only do a soft trim. The signal extractor
// does the heavy lifting. We DON'T lowercase here because we want to preserve
// case for some patterns (e.g. "VC" vs "vc").
export function cleanNotes(raw: string): string {
  return (raw ?? "").trim();
}

/* ---------- orchestrator ---------- */
// Map a raw CSV row into a CleanedLead. Field names come from the export
// header — if a future export renames a column, this is the only function
// that needs updating.
export function cleanRow(row: Record<string, string>): CleanedLead {
  const email = cleanEmail(row.email ?? "");
  return {
    lead_id: cleanLeadId(row.lead_id ?? ""),
    created_iso: cleanDate(row.created ?? ""),
    created_raw: (row.created ?? "").trim(),
    name: (row.name ?? "").trim(),
    email: email.email,
    email_valid: email.valid,
    company: (row.company ?? "").trim(),
    employees_est: cleanEmployees(row.employees ?? ""),
    employees_raw: (row.employees ?? "").trim(),
    website: (row.website ?? "").trim(),
    website_normalized: cleanWebsite(row.website ?? ""),
    title: (row.title ?? "").trim(),
    source: (row.source ?? "").trim(),
    source_clean: cleanSource(row.source ?? ""),
    budget_monthly_usd: cleanBudget(row.monthly_budget ?? ""),
    budget_raw: (row.monthly_budget ?? "").trim(),
    notes: cleanNotes(row.notes ?? ""),
  };
}
