import crypto from "crypto";

export const CANONICAL_JSON_VERSION = "c2c-json-v1";

export type CanonicalDialogue = {
  prompt: string;
  response: string;
};

export function normalizeCanonicalText(value: unknown): string {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function containsContactData(value: string): boolean {
  return /(?:\+?\d[\d\s().-]{7,}\d|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i.test(value);
}

export function validateCanonicalJson(input: any): { dialogues: CanonicalDialogue[]; warnings: string[] } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("JSON must contain an object.");
  }

  const rows = input.trainingData;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("JSON must contain a non-empty trainingData array.");
  }
  if (rows.length > 10000) throw new Error("JSON contains too many dialogue records.");

  const warnings: string[] = [];
  const dialogues = rows.map((row: any, index: number) => {
    if (!row || typeof row !== "object") throw new Error(`trainingData[${index}] is invalid.`);
    const prompt = normalizeCanonicalText(row.prompt);
    const response = normalizeCanonicalText(row.response);
    if (!prompt || !response) throw new Error(`trainingData[${index}] needs prompt and response text.`);
    if (containsContactData(prompt) || containsContactData(response)) {
      throw new Error(`trainingData[${index}] appears to contain contact data.`);
    }
    if (row.qualityScore !== undefined || row.isInstructionalUseful !== undefined) {
      warnings.push("Client-provided scores were ignored and will be recomputed.");
    }
    return { prompt, response };
  });

  return { dialogues, warnings: [...new Set(warnings)] };
}

export function hashCanonicalDialogues(dialogues: CanonicalDialogue[]): string {
  const canonical = dialogues.map(d => `${d.prompt}\n${d.response}`).join("\n---\n");
  return crypto.createHash("sha256").update(`${CANONICAL_JSON_VERSION}\n${canonical}`).digest("hex");
}
