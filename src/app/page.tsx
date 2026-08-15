"use client";

import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  Download,
  FileUp,
  ListFilter,
  Search,
} from "lucide-react";
import type { LeadStatus, ScoredLead, TriageResult } from "@/lib/leads";
import {
  LeadDetail,
  ScoreBar,
  SignalChip,
  STATUS_LABEL,
  StatusBadge,
} from "@/components/lead-triage/parts";
import { AsciiSpinner, SectionEyebrow, TriageMark } from "@/components/lead-triage/brand";

type FilterStatus = "all" | LeadStatus;

const BUILD_STAMP = "v1.0 · 2025.08";
const RUNTIME_LABEL = "Next.js 16 · TS · serverless triage";

export default function Home() {
  const [result, setResult] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ---------- data loading ---------- */
  const runTriage = useCallback(async (csvText: string, label: string) => {
    setLoading(true);
    setError(null);
    setFileName(label);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: csvText,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const data: TriageResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSample = useCallback(() => {
    runTriage("", "sample-leads.csv");
    fetch("/sample-leads.csv")
      .then((r) => r.text())
      .then((text) => runTriage(text, "sample-leads.csv"))
      .catch(() => setError("Couldn't load the sample CSV."));
  }, [runTriage]);

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        runTriage(text, file.name);
      };
      reader.onerror = () => setError("Couldn't read the file.");
      reader.readAsText(file);
      e.target.value = "";
    },
    [runTriage]
  );

  /* ---------- filtering ---------- */
  const filteredLeads = useMemo(() => {
    if (!result) return [];
    const q = query.trim().toLowerCase();
    return result.leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (sourceFilter !== "all" && l.source_clean !== sourceFilter) return false;
      if (q) {
        const hay = `${l.lead_id} ${l.name} ${l.email} ${l.company} ${l.title} ${l.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [result, query, statusFilter, sourceFilter]);

  const sources = useMemo(() => {
    if (!result) return [];
    return Object.keys(result.summary.by_source).sort();
  }, [result]);

  /* ---------- export ---------- */
  const handleExport = useCallback(() => {
    if (!result) return;
    const rows = [
      ["lead_id","status","rank","score","company","name","title","source","budget_monthly_usd","recommendation_reason","top_signals"],
      ...result.leads.map((l) => {
        const top = [...l.signals]
          .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
          .slice(0, 5)
          .map((s) => s.label)
          .join(" | ");
        return [
          l.lead_id,
          l.status,
          String(l.rank),
          String(l.score),
          l.company,
          l.name,
          l.title,
          l.source,
          l.budget_monthly_usd?.toString() ?? "",
          l.recommendation_reason,
          top,
        ];
      }),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "triaged-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  /* ---------- render ---------- */
  return (
    <div className="min-h-screen bg-background">
      {/* ===== Masthead ===== */}
      <header className="sticky top-0 z-20 border-b border-[var(--rule)] bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-[1280px] px-5 md:px-8">
          {/* Main masthead row */}
          <div className="flex items-end justify-between py-3">
            <div className="flex items-end gap-3">
              <TriageMark className="h-9 w-9 text-primary" />
              <div className="leading-none">
                <h1 className="font-display text-[28px] leading-[0.95] text-foreground">
                  Triage
                </h1>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Inbound lead scoring
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="csv-upload"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("csv-upload")?.click()}
                disabled={loading}
                className="h-8 rounded-none border-[var(--rule)] font-medium"
              >
                <FileUp className="mr-1.5 h-3.5 w-3.5" />
                Upload CSV
              </Button>
              <Button
                size="sm"
                onClick={handleSample}
                disabled={loading}
                className="h-8 rounded-none font-medium"
              >
                {loading && <AsciiSpinner className="mr-1.5 h-3.5 w-3.5" />}
                {loading ? "Working" : "Sample data"}
              </Button>
              {result && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="h-8 rounded-none border-[var(--rule)] font-medium"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-5 md:px-8">
        {error && (
          <div className="mt-6 border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span className="font-mono text-[10px] uppercase tracking-wide">
              Error
            </span>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {!result && !loading && (
          <EmptyState
            onSample={handleSample}
            onUpload={() => document.getElementById("csv-upload")?.click()}
          />
        )}

        {loading && !result && <LoadingState />}

        {result && (
          <div className="anim-fade-in py-6">
            {/* ===== Section: summary ===== */}
            <section className="mb-8">
              <SectionEyebrow index="01" label="Triage summary" />

              <div className="mt-4 grid grid-cols-1 gap-px bg-[var(--rule)] md:grid-cols-5">
                <StatCell
                  index="A"
                  label="Total parsed"
                  value={result.summary.total}
                  hint={`${result.meta.skipped_rows} rows skipped · avg ${result.summary.avg_score}`}
                  wide
                />
                <StatCell
                  index="B"
                  label="Contact now"
                  value={result.summary.contact_now}
                  accent="go"
                  hint={`${pct(result.summary.contact_now, result.summary.total)} of total`}
                />
                <StatCell
                  index="C"
                  label="Nurture"
                  value={result.summary.nurture}
                  accent="hold"
                  hint={`${pct(result.summary.nurture, result.summary.total)} of total`}
                />
                <StatCell
                  index="D"
                  label="Disqualify"
                  value={result.summary.disqualify}
                  accent="no"
                  hint={`${pct(result.summary.disqualify, result.summary.total)} of total`}
                />
                <StatCell
                  index="E"
                  label="Median score"
                  value={result.summary.median_score}
                  hint="out of 100"
                />
              </div>

              <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
                <p>
                  Source file{" "}
                  <span className="font-mono text-foreground">{fileName}</span>
                  {" · "}
                  generated{" "}
                  <span className="font-mono text-foreground">
                    {new Date(result.meta.generated_at).toLocaleString("en-GB")}
                  </span>
                </p>
                <p className="font-mono">{RUNTIME_LABEL}</p>
              </div>
            </section>

            {/* ===== Section: ranked list ===== */}
            <section>
              <SectionEyebrow index="02" label="Ranked shortlist" />

              {/* Filter bar */}
              <div className="mt-4 mb-3 flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search name, company, notes…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-9 w-[260px] rounded-none pl-8"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as FilterStatus)}
                >
                  <SelectTrigger className="h-9 w-[150px] rounded-none">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="contact_now">Contact now</SelectItem>
                    <SelectItem value="nurture">Nurture</SelectItem>
                    <SelectItem value="disqualify">Disqualify</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={sourceFilter}
                  onValueChange={setSourceFilter}
                >
                  <SelectTrigger className="h-9 w-[150px] rounded-none">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    {sources.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="font-mono">
                    {filteredLeads.length} / {result.summary.total}
                  </span>
                </div>
              </div>

              {/* Table */}
              <Card className="overflow-hidden rounded-none p-0">
                <div className="max-h-[68vh] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-card">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-8" />
                        <TableHead className="w-12 text-right font-mono text-[10px] uppercase tracking-wider">
                          #
                        </TableHead>
                        <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                          Lead
                        </TableHead>
                        <TableHead className="hidden font-mono text-[10px] uppercase tracking-wider md:table-cell">
                          Title
                        </TableHead>
                        <TableHead className="hidden font-mono text-[10px] uppercase tracking-wider md:table-cell">
                          Source
                        </TableHead>
                        <TableHead className="text-right font-mono text-[10px] uppercase tracking-wider">
                          Budget
                        </TableHead>
                        <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                          Score
                        </TableHead>
                        <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((lead, idx) => {
                        const key = `${lead.lead_id}-${idx}`;
                        const expanded = expandedId === key;
                        return (
                          <LeadRow
                            key={key}
                            lead={lead}
                            expanded={expanded}
                            onToggle={() =>
                              setExpandedId(expanded ? null : key)
                            }
                          />
                        );
                      })}
                      {filteredLeads.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="py-16 text-center text-sm text-muted-foreground"
                          >
                            No leads match the current filters.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </section>

            {/* ===== Section: methodology ===== */}
            <section className="mt-10">
              <SectionEyebrow index="03" label="How the score is built" />
              <details className="mt-4 border border-border bg-card p-5 text-sm">
                <summary className="cursor-pointer font-medium text-foreground">
                  Open the scorecard
                </summary>
                <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Each lead is cleaned (5 date formats, employee ranges,
                    28+ budget string variants) and then scored against a
                    transparent, weighted scorecard. The score is a sum of
                    discrete signals — every one of them is surfaced inline
                    in the row, and again in the expanded view, so there are
                    no black boxes.
                  </p>
                  <ul className="ml-4 list-disc space-y-1.5">
                    <li>
                      <strong className="text-foreground">Urgency</strong>{" "}
                      (+18 to +28): "budget approved", "decision this month",
                      "ready to pilot", "I make the call here". The only
                      signals that can trigger a Contact Now.
                    </li>
                    <li>
                      <strong className="text-foreground">Pain</strong>{" "}
                      (+8 to +14): "eating our week", "by hand",
                      "copy-pasting", "want it automated end to end". Real
                      need, no decision date.
                    </li>
                    <li>
                      <strong className="text-foreground">Budget</strong>{" "}
                      (+5 to +40): parsed from "$8,000/mo", "5k-7k", "8k",
                      "0", "TBD" — bucketed by tier.
                    </li>
                    <li>
                      <strong className="text-foreground">Authority</strong>{" "}
                      (-25 to +30): CEO / Founder / Owner beats VP / Head of,
                      which beats mid-tier. Student / Recruiter / Developer /
                      Journalist titles lose points.
                    </li>
                    <li>
                      <strong className="text-foreground">Company size</strong>{" "}
                      (0 to +25): bigger team = more pain to automate.
                    </li>
                    <li>
                      <strong className="text-foreground">Source</strong>{" "}
                      (-40 to +22): referral strongest, webform weakest,
                      "test" / "source" auto-junked.
                    </li>
                    <li>
                      <strong className="text-foreground">
                        Disqualifier phrases
                      </strong>{" "}
                      (-100): "looking for a role", "attaching my CV", "VC
                      here", "SMM panel", "WON $1,000,000".
                    </li>
                  </ul>
                  <p>
                    <strong className="text-foreground">Classification:</strong>{" "}
                    <em>Contact now</em> requires an urgency signal AND
                    score ≥ 65. <em>Nurture</em> = real fit but no urgency
                    (score ≥ 40, or pain + budget). <em>Disqualify</em> = hard
                    disqualifier phrase, junk source, or no real signal.
                  </p>
                  <p>
                    The full scoring logic lives in{" "}
                    <code className="bg-muted px-1 py-0.5 font-mono text-xs">
                      src/lib/leads/
                    </code>{" "}
                    — every signal weight is a constant you can audit and
                    tune.
                  </p>
                </div>
              </details>
            </section>
          </div>
        )}
      </main>

      {/* ===== Colophon ===== */}
      <footer className="mt-16 border-t border-[var(--rule)] bg-card/40">
        <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
          <div className="grid gap-6 md:grid-cols-[auto_1fr_auto] md:items-end">
            <TriageMark className="h-7 w-7 text-muted-foreground" />

            <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
              <p className="text-foreground">
                Built by Crypterib.
              </p>
              <p>
                Source:{" "}
                <a
                  href="https://github.com/Crypterib/triage"
                  className="link-rule text-foreground"
                  target="_blank"
                  rel="noopener"
                >
                  github.com/Crypterib/triage
                </a>
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground md:text-right">
              <dt>Build</dt>
              <dd className="font-mono text-foreground">{BUILD_STAMP}</dd>
              <dt>Stack</dt>
              <dd className="font-mono text-foreground normal-case tracking-normal">
                Next 16 · TS
              </dd>
              <dt>Engine</dt>
              <dd className="font-mono text-foreground normal-case tracking-normal">
                Rule-based
              </dd>
              <dt>Sample</dt>
              <dd className="font-mono text-foreground normal-case tracking-normal">
                100 / 520 go
              </dd>
            </dl>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- subcomponents ---------- */
function EmptyState({
  onSample,
  onUpload,
}: {
  onSample: () => void;
  onUpload: () => void;
}) {
  return (
    <div className="grid min-h-[62vh] grid-cols-1 py-12 md:grid-cols-[1.4fr_1fr] md:gap-12">
      {/* Left: editorial headline */}
      <div className="anim-fade-up flex flex-col justify-center">
        <div className="eyebrow mb-4">The brief, condensed</div>
        <h2 className="font-display text-[44px] leading-[1.05] text-foreground md:text-[56px]">
          Five hundred leads
          <br />
          walked in this week.
          <br />
          <span className="italic text-[var(--primary)]">Ninety-something</span>{" "}
          are worth a call.
        </h2>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
          Drop the CSV export. The engine cleans the messy dates and
          budget strings, mines the free-text notes for intent, scores
          every row, and hands back a ranked shortlist with a
          recommendation per lead.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button
            onClick={onSample}
            className="h-9 rounded-none px-5 font-medium"
          >
            Run on sample data
          </Button>
          <Button
            variant="outline"
            onClick={onUpload}
            className="h-9 rounded-none border-[var(--rule)] px-5 font-medium"
          >
            <FileUp className="mr-1.5 h-4 w-4" />
            Upload your CSV
          </Button>
        </div>
      </div>

      {/* Right: a small numbered spec sheet — feels like a colophon, not marketing */}
      <div className="anim-fade-up mt-10 border-l border-[var(--rule)] pl-6 md:mt-0">
        <div className="eyebrow mb-4">Spec sheet</div>
        <dl className="space-y-3 text-sm">
          {[
            ["01", "Input", "RFC-4180 CSV, up to 5 MB"],
            ["02", "Cleaning", "5 date formats · ranges · 28+ budget strings"],
            ["03", "Signals", "Urgency · pain · shopping · hesitation · DQ"],
            ["04", "Scoring", "Sum of weighted signals, 0–100"],
            ["05", "Output", "Ranked list + per-lead recommendation"],
            ["06", "Runtime", "Serverless, no DB, no API keys"],
          ].map(([n, k, v]) => (
            <div key={n} className="grid grid-cols-[2.5rem_5.5rem_1fr] gap-2">
              <span className="font-mono text-[10px] text-[var(--primary)]">
                {n}
              </span>
              <span className="font-medium text-foreground">{k}</span>
              <span className="text-muted-foreground">{v}</span>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
          The sample is the exact export from the assessment brief — 520
          rows of messy, real-world lead data. Nothing is mocked.
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Cleaning · scoring · ranking
        <span className="caret h-3" />
      </div>
      <p className="mt-3 max-w-xs text-sm text-muted-foreground">
        Parsing CSV, normalising 28+ budget string variants, mining
        free-text notes for urgency and pain signals.
      </p>
    </div>
  );
}

function StatCell({
  index,
  label,
  value,
  hint,
  accent,
  wide,
}: {
  index: string;
  label: string;
  value: number | string;
  hint?: string;
  accent?: "go" | "hold" | "no";
  wide?: boolean;
}) {
  const accentCls = accent
    ? {
        go: "text-[var(--status-go)]",
        hold: "text-[var(--status-hold)]",
        no: "text-[var(--status-no)]",
      }[accent]
    : "text-foreground";

  return (
    <div
      className={`bg-card p-4 ${wide ? "md:col-span-1" : ""} lift hover:bg-background`}
    >
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">{label}</span>
        <span className="font-mono text-[10px] text-[var(--primary)]">
          {index}
        </span>
      </div>
      <div
        className={`mt-2 font-display text-[40px] leading-none tabular-nums ${accentCls}`}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-2 text-xs text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}

function LeadRow({
  lead,
  expanded,
  onToggle,
}: {
  lead: ScoredLead;
  expanded: boolean;
  onToggle: () => void;
}) {
  const topSignals = [...lead.signals]
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
    .slice(0, 3);

  return (
    <>
      <TableRow
        onClick={onToggle}
        className="row-indicator cursor-pointer border-border/60 transition-colors hover:bg-muted/40"
      >
        <TableCell className="p-2 text-center">
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
              expanded ? "" : "-rotate-90"
            }`}
          />
        </TableCell>
        <TableCell className="text-right font-mono text-[11px] tabular-nums text-muted-foreground">
          {String(lead.rank).padStart(3, "0")}
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-foreground">
                {lead.company || lead.name || "(no name)"}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {lead.lead_id}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {lead.name}
              {lead.name && lead.title ? " · " : ""}
              {lead.title}
            </div>
            <div className="flex flex-wrap gap-1">
              {topSignals.map((s, i) => (
                <SignalChip key={i} signal={s} />
              ))}
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
          {lead.title || "—"}
        </TableCell>
        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
          {lead.source || "—"}
        </TableCell>
        <TableCell className="text-right font-mono text-sm tabular-nums">
          {lead.budget_monthly_usd
            ? `$${formatBudget(lead.budget_monthly_usd)}`
            : lead.budget_raw
            ? lead.budget_raw
            : "—"}
        </TableCell>
        <TableCell>
          <ScoreBar score={lead.score} status={lead.status} animate={false} />
        </TableCell>
        <TableCell>
          <StatusBadge status={lead.status} />
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="border-none p-0 hover:bg-transparent">
          <TableCell colSpan={8} className="p-0">
            <div className="anim-fade-in">
              <LeadDetail lead={lead} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

/* ---------- helpers ---------- */
function pct(n: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

function formatBudget(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return String(n);
}
