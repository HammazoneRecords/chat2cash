import test from "node:test";
import assert from "node:assert/strict";
import { calculateTieredPayout, detectContextSignals, segmentConversation } from "../lib/contextGrading";
import { hashCanonicalDialogues, validateCanonicalJson } from "../lib/canonicalJson";
import { hashPair } from "../lib/contentHash";

test("segments a long gap and explicit topic shift", () => {
  const segments = segmentConversation([
    { index: 0, speaker: "Speaker A", text: "How do I register a business?", gapBucket: "short" },
    { index: 1, speaker: "Speaker B", text: "Start with the registration form.", gapBucket: "short" },
    { index: 2, speaker: "Speaker A", text: "By the way, what is the weather?", gapBucket: "long" },
  ]);
  assert.equal(segments.length, 2);
  assert.ok(segments[1].messageIndexes.includes(2));
});

test("detects a follow-up correction signal", () => {
  const signals = detectContextSignals([
    { index: 0, speaker: "Speaker A", text: "Use the old form." },
    { index: 1, speaker: "Speaker B", text: "Actually, use the new form instead." },
  ]);
  assert.equal(signals[0].kind, "reversal");
});

test("flags later negation as a contradiction", () => {
  const signals = detectContextSignals([
    { index: 0, speaker: "Speaker A", text: "The appointment is on Monday." },
    { index: 1, speaker: "Speaker B", text: "No, it is not on Monday; it is on Tuesday." },
  ]);
  assert.equal(signals[0].kind, "contradiction");
  assert.ok(signals[0].confidence >= 0.7);
});

test("calculates tiered payout with multiplier", () => {
  const payout = calculateTieredPayout([
    { tier: "instructional", units: 1 },
    { tier: "language", units: 2 },
    { tier: "rejected", units: 4 },
  ], 2);
  assert.equal(payout.total, 16);
});

test("canonical JSON ignores client grading fields and hashes stable text", () => {
  const first = validateCanonicalJson({ trainingData: [{ prompt: "hello", response: "world", qualityScore: 99 }] });
  const second = validateCanonicalJson({ trainingData: [{ prompt: " hello ", response: "world" }] });
  assert.deepEqual(first.dialogues, second.dialogues);
  assert.equal(hashCanonicalDialogues(first.dialogues), hashCanonicalDialogues(second.dialogues));
  assert.match(first.warnings[0], /ignored/);
});

test("canonical pair hashes are shared by ZIP-derived and JSON submissions", () => {
  const dialogue = { prompt: "[Speaker A]: hello", response: "[Speaker B]: world" };
  const first = hashCanonicalDialogues([dialogue]);
  const pair = hashPair("canonical-pair", `${dialogue.prompt}\n${dialogue.response}`);
  assert.equal(first, hashCanonicalDialogues([dialogue]));
  assert.equal(pair.length, 64);
});
