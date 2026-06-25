import crypto from "crypto";

// Normalize a dialogue pair for hashing — strips casing and punctuation
// so minor edits (capital letters, commas) don't beat deduplication
function normalizePair(speaker: string, text: string): string {
  const normalized = (speaker + "|" + text)
    .toLowerCase()
    .replace(/[^\w\s|]/g, "")   // remove punctuation
    .replace(/\s+/g, " ")        // collapse whitespace
    .trim();
  return normalized;
}

export function hashPair(speaker: string, text: string): string {
  const normalized = normalizePair(speaker, text);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export function hashContent(dialogues: Array<{ speaker: string; text: string }>): string {
  const normalized = dialogues
    .map(d => normalizePair(d.speaker, d.text))
    .join("\n");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export function hashPairs(dialogues: Array<{ speaker: string; text: string }>): string[] {
  return dialogues.map(d => hashPair(d.speaker, d.text));
}
