import { triageLeads } from "../src/lib/leads/triage";
import { readFileSync } from "fs";

const csv = readFileSync("/home/z/my-project/upload/Cohort 3 Assessment — Task 1 Leads (messy).csv", "utf8");
const result = triageLeads(csv);

console.log("=== Summary ===");
console.log("Total parsed:", result.summary.total);
console.log("Contact now:", result.summary.contact_now);
console.log("Nurture:", result.summary.nurture);
console.log("Disqualify:", result.summary.disqualify);
console.log("Avg score:", result.summary.avg_score);
console.log("Median score:", result.summary.median_score);
console.log("By source:", result.summary.by_source);
console.log("Skipped rows:", result.meta.skipped_rows);

console.log("\n=== Top 10 Contact Now ===");
result.leads.filter(l => l.status === "contact_now").slice(0, 10).forEach(l => {
  console.log(`#${l.rank} ${l.lead_id} | ${l.company || "(no company)"} | ${l.title || "(no title)"} | score=${l.score} | budget=$${l.budget_monthly_usd}/mo | ${l.recommendation_reason}`);
  console.log(`   signals: ${l.signals.map(s => `${s.label}(${s.points})`).join(", ")}`);
});

console.log("\n=== Sample Nurture (5) ===");
result.leads.filter(l => l.status === "nurture").slice(0, 5).forEach(l => {
  console.log(`#${l.rank} ${l.lead_id} | ${l.company} | ${l.title} | score=${l.score} | ${l.recommendation_reason}`);
});

console.log("\n=== Sample Disqualify (10) ===");
result.leads.filter(l => l.status === "disqualify").slice(0, 10).forEach(l => {
  console.log(`${l.lead_id} | ${l.title} | score=${l.score} | ${l.recommendation_reason}`);
});
