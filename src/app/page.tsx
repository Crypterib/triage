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
  ChevronRight,
  Download,
  FileUp,
  Loader2,
  Sparkles,
  ListFilter,
} from "lucide-react";
import type { LeadStatus, ScoredLead, TriageResult } from "@/lib/leads";
import {
  LeadDetail,
  ScoreBar,
  SignalChip,
  STATUS_LABEL,
  StatusBadge,
} from "@/components/lead-triage/parts";

type FilterStatus = "all" | LeadStatus;

export default function Home() {
  const [result, setResult] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  // Filters
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  // Expanded row
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
    // Fetch the embedded sample, then POST it. Doing it this way so the
    // UI shows the loading state immediately.
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
      // Reset input so the same file can be re-uploaded if needed.
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
      ["lead_id", "status", "rank", "score", "company", "name", "title", "source", "budget_monthly_usd", "recommendation_reason", "top_signals"],
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
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-foreground">
                Lead Triage
              </h1>
              <p className="text-xs text-muted-foreground">
                Inbound lead scoring &amp; prioritisation
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
            >
              <FileUp className="mr-1.5 h-3.5 w-3.5" />
              Upload CSV
            </Button>
            <Button
              size="sm"
              onClick={handleSample}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              {loading ? "Working…" : "Use sample data"}
            </Button>
            {result && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <strong className="font-semibold">Error:</strong> {error}
          </div>
        )}

        {!result && !loading && <EmptyState onSample={handleSample} onUpload={() => document.getElementById("csv-upload")?.click()} />}

        {loading && !result && <LoadingState />}

        {result && (
          <>
            {/* File + meta */}
            <div className="mb-4 flex items-baseline justify-between">
              <p className="text-sm text-muted-foreground">
                Source: <span className="font-mono text-foreground">{fileName}</span>
                {" · "}
                {result.summary.total} leads parsed
                {" · "}
                {result.meta.skipped_rows} skipped
              </p>
              <p className="text-xs text-muted-foreground">
                Generated {new Date(result.meta.generated_at).toLocaleString()}
              </p>
            </div>

            {/* Stats */}
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
              <StatCard
                label="Total leads"
                value={result.summary.total}
                hint={`avg score ${result.summary.avg_score}`}
              />
              <StatCard
                label="Contact now"
                value={result.summary.contact_now}
                accent="go"
                hint={`${pct(result.summary.contact_now, result.summary.total)} of total`}
              />
              <StatCard
                label="Nurture"
                value={result.summary.nurture}
                accent="hold"
                hint={`${pct(result.summary.nurture, result.summary.total)} of total`}
              />
              <StatCard
                label="Disqualify"
                value={result.summary.disqualify}
                accent="no"
                hint={`${pct(result.summary.disqualify, result.summary.total)} of total`}
              />
              <StatCard
                label="Median score"
                value={result.summary.median_score}
                hint="/ 100"
              />
            </div>

            {/* Filter bar */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <ListFilter className="h-4 w-4" />
                <span className="hidden sm:inline">Filter</span>
              </div>
              <Input
                placeholder="Search name, company, email, notes…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 max-w-xs"
              />
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as FilterStatus)}
              >
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="contact_now">Contact now</SelectItem>
                  <SelectItem value="nurture">Nurture</SelectItem>
                  <SelectItem value="disqualify">Disqualify</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="h-9 w-[150px]">
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
              <div className="ml-auto text-xs text-muted-foreground">
                Showing {filteredLeads.length} of {result.summary.total}
              </div>
            </div>

            {/* Table */}
            <Card className="overflow-hidden p-0">
              <div className="max-h-[70vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead className="w-12 text-right">#</TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead className="hidden md:table-cell">Title</TableHead>
                      <TableHead className="hidden md:table-cell">Source</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead, idx) => {
                      const expanded = expandedId === `${lead.lead_id}-${idx}`;
                      return (
                        <LeadRow
                          key={`${lead.lead_id}-${idx}`}
                          lead={lead}
                          expanded={expanded}
                          onToggle={() =>
                            setExpandedId(expanded ? null : `${lead.lead_id}-${idx}`)
                          }
                        />
                      );
                    })}
                    {filteredLeads.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                          No leads match the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Methodology link */}
            <details className="mt-6 rounded-md border border-border bg-card p-4 text-sm">
              <summary className="cursor-pointer font-semibold text-foreground">
                How the scoring works (click to expand)
              </summary>
              <div className="mt-3 space-y-3 text-muted-foreground">
                <p>
                  Every lead is cleaned (date formats, employee ranges, budget
                  strings all normalised) and then scored against a transparent
                  weighted scorecard. The score is a sum of discrete signals:
                </p>
                <ul className="ml-4 list-disc space-y-1">
                  <li><strong className="text-foreground">Urgency signals</strong> (+18 to +28): "budget approved", "decision this month", "ready to pilot", "I make the call here", etc. The only signals that can trigger a Contact Now recommendation.</li>
                  <li><strong className="text-foreground">Pain signals</strong> (+8 to +14): "eating our week", "by hand", "copy-pasting", "want it automated end to end". Real need, no decision date.</li>
                  <li><strong className="text-foreground">Budget</strong> (+5 to +40): parsed from messy strings like "$8,000/mo", "5k-7k", "8k". Bucketed by tier.</li>
                  <li><strong className="text-foreground">Authority</strong> (-25 to +30): CEO/Founder/Owner beats VP/Head of, which beats mid-tier. Student/Recruiter/Developer/Journalist titles lose points.</li>
                  <li><strong className="text-foreground">Company size</strong> (0 to +25): bigger team = more pain to automate.</li>
                  <li><strong className="text-foreground">Source</strong> (-40 to +22): referral strongest, webform weakest, "test"/"source" auto-junked.</li>
                  <li><strong className="text-foreground">Disqualifier phrases</strong> (-100): "looking for a role", "attaching my CV", "VC here", "SMM panel", "WON $1,000,000", etc.</li>
                </ul>
                <p>
                  <strong className="text-foreground">Classification:</strong>{" "}
                  <em>Contact now</em> requires an urgency signal AND score ≥ 65.
                  <em> Nurture</em> = real fit but no urgency (score ≥ 40, or pain + budget).
                  <em> Disqualify</em> = hard disqualifier phrase, junk source, or no real signal.
                </p>
                <p>
                  The full scoring logic lives in <code className="rounded bg-muted px-1 py-0.5 text-xs">src/lib/leads/</code> — every signal weight is a constant you can audit and tune.
                </p>
              </div>
            </details>
          </>
        )}
      </main>

      <footer className="mt-12 border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 text-xs text-muted-foreground md:px-6">
          Lead triage system — built for the Cohort 3 assessment. Scoring runs
          entirely on the server; no lead data leaves the request.
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="max-w-md">
        <h2 className="text-2xl font-semibold text-foreground">
          Turn 500 inbound leads into a ranked shortlist.
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Upload a CSV export (or try the sample) and the system will clean
          the messy data, mine the free-text notes for intent, score every
          lead, and tell you who to call this week, who to nurture, and who
          to drop.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={onSample}>Use sample data</Button>
          <Button variant="outline" onClick={onUpload}>
            <FileUp className="mr-1.5 h-4 w-4" />
            Upload your CSV
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          The sample is the exact export from the assessment brief — 520 rows
          of messy, real-world lead data.
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-3 text-sm text-muted-foreground">
        Cleaning, scoring, and ranking leads…
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: "go" | "hold" | "no";
}) {
  const accentCls = accent
    ? {
        go: "border-[var(--status-go)]/30 bg-[var(--status-go-bg)]",
        hold: "border-[var(--status-hold)]/30 bg-[var(--status-hold-bg)]",
        no: "border-[var(--status-no)]/30 bg-[var(--status-no-bg)]",
      }[accent]
    : "border-border bg-card";
  const valueColor = accent
    ? {
        go: "text-[var(--status-go)]",
        hold: "text-[var(--status-hold)]",
        no: "text-[var(--status-no)]",
      }[accent]
    : "text-foreground";
  return (
    <Card className={`p-4 ${accentCls}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${valueColor}`}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </Card>
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
  // Show the 3 highest-impact signals inline; full breakdown in the expanded view.
  const topSignals = [...lead.signals]
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
    .slice(0, 3);

  return (
    <>
      <TableRow
        onClick={onToggle}
        className="cursor-pointer hover:bg-muted/50"
      >
        <TableCell className="p-2 text-center">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="text-right font-mono text-xs text-muted-foreground">
          {lead.rank}
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                {lead.company || lead.name || "(no name)"}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {lead.lead_id}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">
                {lead.name}
                {lead.name && lead.title ? " · " : ""}
                {lead.title}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
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
          <ScoreBar score={lead.score} status={lead.status} />
        </TableCell>
        <TableCell>
          <StatusBadge status={lead.status} />
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-transparent hover:bg-transparent">
          <TableCell colSpan={8} className="p-0">
            <LeadDetail lead={lead} />
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
