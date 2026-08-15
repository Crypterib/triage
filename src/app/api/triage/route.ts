import { NextRequest, NextResponse } from "next/server";
import { triageLeads } from "@/lib/leads";

// POST /api/triage
// Body: { csv: string }  (raw CSV text)
// Returns: TriageResult JSON
//
// We cap the body size at ~5MB — the sample export is ~110KB so this is plenty
// of headroom, and it stops a stray huge upload from melting the serverless
// function.
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (!raw) {
      return NextResponse.json({ error: "Empty request body" }, { status: 400 });
    }
    if (Buffer.byteLength(raw, "utf8") > MAX_BYTES) {
      return NextResponse.json(
        { error: `CSV too large (max ${MAX_BYTES / 1024 / 1024}MB)` },
        { status: 413 }
      );
    }

    const result = triageLeads(raw);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET returns a short description so the endpoint is self-documenting if
// someone hits it in a browser.
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/triage",
    method: "POST",
    body: { csv: "string (raw CSV text)" },
    description:
      "Triage a lead export. Returns scored + ranked leads with recommendations.",
  });
}
