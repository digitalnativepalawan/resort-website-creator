import type { AgentConfig, AgentKnowledge } from "@/hooks/useAgentConfig";
import { SKILL_LABELS } from "@/hooks/useAgentConfig";

/**
 * One CSV = both knowledge AND skills, so a non-technical user manages
 * everything in a single Excel/Sheets file.
 *
 * Columns: type, question, answer, keywords, skill_id, enabled
 *   - knowledge row: type=knowledge, fill question/answer/keywords
 *   - skill row:     type=skill, fill skill_id + enabled (true/false)
 */

const COLS = ["type", "question", "answer", "keywords", "skill_id", "enabled"];

function esc(v: string): string {
  return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

function buildRows(opts: { examples: boolean; data?: AgentConfig }): string[] {
  const lines = [COLS.join(",")];
  if (opts.examples) {
    lines.push(
      ["knowledge", "Do you allow pets?", "Yes, well-behaved pets are welcome.", "pets;dog;cat", "", ""]
        .map(esc)
        .join(","),
    );
    lines.push(
      ["knowledge", "What time is check-out?", "Check-out is 11:00 AM.", "checkout;time", "", ""]
        .map(esc)
        .join(","),
    );
  } else if (opts.data) {
    for (const k of opts.data.knowledge) {
      lines.push(
        ["knowledge", k.question, k.answer, (k.keywords || []).join("; "), "", ""].map(esc).join(","),
      );
    }
  }
  for (const id of Object.keys(SKILL_LABELS)) {
    const enabled = opts.examples ? false : (opts.data?.skills.includes(id) ?? false);
    lines.push(["skill", "", "", "", id, enabled ? "true" : "false"].map(esc).join(","));
  }
  return lines;
}

function triggerDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Blank template with 2 example rows so the user learns the format. */
export function downloadAgentTemplate() {
  triggerDownload(buildRows({ examples: true }).join("\r\n"), "agent-template.csv");
}

/** Export the operator's current knowledge + skills. */
export function downloadAgentData(c: AgentConfig) {
  triggerDownload(buildRows({ examples: false, data: c }).join("\r\n"), "agent-data.csv");
}

export interface ParsedAgent {
  knowledge: AgentKnowledge[];
  skills: string[];
  skillRows: number;
}

/** Parse an uploaded CSV back into knowledge + skills. Tolerant of extra columns. */
export function parseAgentCsv(text: string): ParsedAgent {
  const rows = parseCsv(text);
  if (rows.length < 2) return { knowledge: [], skills: [], skillRows: 0 };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const ix = (n: string) => header.indexOf(n);
  const tI = ix("type");
  const qI = ix("question");
  const aI = ix("answer");
  const kI = ix("keywords");
  const sI = ix("skill_id");
  const eI = ix("enabled");

  const knowledge: AgentKnowledge[] = [];
  const skills: string[] = [];
  let skillRows = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const type = (tI >= 0 ? r[tI] : "").trim().toLowerCase();
    if (type === "knowledge") {
      const q = (qI >= 0 ? r[qI] : "").trim();
      const a = (aI >= 0 ? r[aI] : "").trim();
      const kraw = kI >= 0 ? r[kI] : "";
      const keywords = kraw
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (q || a) knowledge.push({ id: Math.random().toString(36).slice(2, 9), question: q, answer: a, keywords });
    } else if (type === "skill") {
      skillRows++;
      const sid = (sI >= 0 ? r[sI] : "").trim();
      const en = (eI >= 0 ? r[eI] : "").trim().toLowerCase();
      if (sid && (en === "true" || en === "yes" || en === "1")) skills.push(sid);
    }
  }
  return { knowledge, skills, skillRows };
}

/** Minimal RFC-4180-ish CSV parser (handles quotes, commas, embedded newlines). */
function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field);
        out.push(row);
        row = [];
        field = "";
      } else if (ch !== "\r") field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    out.push(row);
  }
  return out;
}
