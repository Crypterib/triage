# Lead Triage

An automated lead-qualification system for a marketing agency drowning in inbound leads. Drop in a CSV export, get back a ranked shortlist with contact-now / nurture / disqualify recommendations and a full signal breakdown for every lead.

Built for the Cohort 3 developers bootcamp assessment (Task 1).

## What it does

- **Cleans messy data** — 5+ date formats, employee ranges (`~11`, `6+`, `31-51`), 28 different budget string formats (`$8,000/mo`, `5k-7k`, `8k`, `asdf`, `TBD`), inconsistent lead IDs, junk source values.
- **Mines free-text notes** for intent signals — urgency phrases (`budget approved`, `decision this month`, `ready to pilot`), pain (`eating our week`, `by hand`), hesitation (`price sensitive`), and hard disqualifiers (`looking for a role`, `VC here`, `SMM panel`).
- **Scores every lead** on a transparent weighted scorecard and classifies into one of three buckets.
- **Surfaces every signal** in the UI so a rep can audit and override the score.

## How to run it

```bash
bun install        # or npm install
bun run dev        # or npm run dev
```

Open http://localhost:3000, click **Use sample data** (or upload your own CSV with the same columns).

To deploy: push to GitHub, import the repo into Vercel, deploy. No env vars, no database, no API keys needed.

## How scoring works

The full logic lives in [`src/lib/leads/`](src/lib/leads/) as pure functions:

| File | Responsibility |
|------|----------------|
| `cleaners.ts` | Normalises dates, employee ranges, budget strings, lead IDs, emails, websites |
| `signals.ts` | Phrase-bank + signal extractor (urgency, pain, shopping, hesitation, disqualifier) |
| `score.ts` | Sums signal points → score, applies status decision rules |
| `triage.ts` | Orchestrates parse → clean → score → rank |
| `csv.ts` | Minimal RFC-4180 CSV parser (no deps) |
| `types.ts` | Shared types |

**Classification rules:**

- **Contact now** — requires an urgency signal AND score ≥ 65. Budget + title alone doesn't qualify.
- **Nurture** — real fit (score ≥ 40, or pain + budget) but missing the urgency trigger.
- **Disqualify** — hard disqualifier phrase, junk source, or no real signal.

Every weight is a named constant — tune them in `signals.ts` without touching anything else.

## Tech stack

- Next.js 16 + TypeScript
- Tailwind CSS 4 + shadcn/ui
- Pure serverless — scoring runs in the API route, no external calls

## Sample results

Running the system against the assessment's sample export (520 leads):

| Status | Count | % |
|--------|-------|---|
| Contact now | 100 | 19% |
| Nurture | 245 | 47% |
| Disqualify | 175 | 34% |

Average score 57.4 / median 64.
