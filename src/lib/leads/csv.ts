// Minimal RFC-4180-ish CSV parser.
// We could pull in papaparse, but the only edge case in this export is
// quoted fields containing commas + trailing whitespace, and writing it
// ourselves keeps the deploy bundle tiny and the logic auditable.

export interface ParsedRow {
  headers: string[];
  rows: Record<string, string>[];
  skipped: number;
}

export function parseCSV(input: string): ParsedRow {
  // Normalise line endings — the export has a mix of \n and \r\n.
  const text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  // Flush trailing field/row if file doesn't end on \n.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], skipped: 0 };
  }

  const headers = rows[0].map((h) => h.trim());
  const out: Record<string, string>[] = [];
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    // Skip blank trailing rows (common when files end with \n\n).
    if (r.length === 1 && r[0].trim() === "") {
      skipped++;
      continue;
    }
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = (r[c] ?? "").trim();
    }
    out.push(obj);
  }

  return { headers, rows: out, skipped };
}
