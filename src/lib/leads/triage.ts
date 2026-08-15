// Top-level orchestrator. Takes raw CSV text, returns a fully scored +
// ranked TriageResult. This is the only function the API route needs to
// call — keeping the surface area tiny makes the system trivially
// reusable against future exports.

import { parseCSV } from "./csv";
import { cleanRow } from "./cleaners";
import { scoreLead } from "./score";
import type { ScoredLead, TriageResult, LeadStatus } from "./types";

const STATUS_ORDER: LeadStatus[] = ["contact_now", "nurture", "disqualify"];

export function triageLeads(csvText: string): TriageResult {
  const parsed = parseCSV(csvText);

  // Clean + score every row.
  const scored: ScoredLead[] = parsed.rows.map((row) => {
    const cleaned = cleanRow(row);
    return scoreLead(cleaned);
  });

  // Rank within each status bucket, score descending.
  const buckets: Record<LeadStatus, ScoredLead[]> = {
    contact_now: [],
    nurture: [],
    disqualify: [],
  };
  for (const lead of scored) buckets[lead.status].push(lead);

  for (const status of STATUS_ORDER) {
    buckets[status].sort((a, b) => b.score - a.score);
    buckets[status].forEach((lead, i) => {
      lead.rank = i + 1;
    });
  }

  // Final flat list: contact_now first, then nurture, then disqualify.
  const ranked = [
    ...buckets.contact_now,
    ...buckets.nurture,
    ...buckets.disqualify,
  ];

  // Summary stats.
  const allScores = scored.map((l) => l.score).sort((a, b) => a - b);
  const by_source: Record<string, number> = {};
  for (const l of scored) {
    const s = l.source_clean || "unknown";
    by_source[s] = (by_source[s] || 0) + 1;
  }

  return {
    leads: ranked,
    summary: {
      total: scored.length,
      contact_now: buckets.contact_now.length,
      nurture: buckets.nurture.length,
      disqualify: buckets.disqualify.length,
      avg_score: round1(avg(allScores)),
      median_score: median(allScores),
      by_source,
    },
    meta: {
      parsed_rows: parsed.rows.length,
      skipped_rows: parsed.skipped,
      generated_at: new Date().toISOString(),
    },
  };
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 === 0 ? round1((xs[mid - 1] + xs[mid]) / 2) : xs[mid];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
