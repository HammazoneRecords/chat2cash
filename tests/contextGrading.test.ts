import test from "node:test";
import assert from "node:assert/strict";
import { calculateTieredPayout, detectContextSignals, gradeSegment, segmentConversation } from "../lib/contextGrading";
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

test("keeps follow-up context inside the same short thread", () => {
  const messages = [
    { index: 0, speaker: "Speaker A", text: "Should I register the business now?" },
    { index: 1, speaker: "Speaker B", text: "Wait until you have regular invoices first." },
    { index: 2, speaker: "Speaker A", text: "What if the bank asks for proof next week?" },
    { index: 3, speaker: "Speaker B", text: "Then register now because that changes the risk and timing." },
  ];
  const segments = segmentConversation(messages);
  const grade = gradeSegment(messages, segments[0]);
  assert.equal(segments.length, 1);
  assert.equal(grade.dimensions.followupValue.score, 70);
  assert.deepEqual(grade.dimensions.followupValue.evidence, [0, 1, 2, 3]);
});

test("splits explicit topic changes within one exported thread", () => {
  const segments = segmentConversation([
    { index: 0, speaker: "Speaker A", text: "How should I price the catering order?", gapBucket: "short" },
    { index: 1, speaker: "Speaker B", text: "Start with ingredients, labour, delivery, and margin.", gapBucket: "short" },
    { index: 2, speaker: "Speaker A", text: "Changing subject, the van insurance renewal is due Friday.", gapBucket: "long" },
    { index: 3, speaker: "Speaker B", text: "Handle the insurance first because the van blocks every delivery.", gapBucket: "short" },
  ]);
  assert.equal(segments.length, 2);
  assert.ok(segments[1].boundaryReasons.includes("long inactivity gap"));
  assert.ok(segments[1].boundaryReasons.includes("explicit topic marker"));
});

test("scores Patois and code-switching as language value when meaning is clear", () => {
  const messages = [
    { index: 0, speaker: "Speaker A", text: "mi waan price di jerk box dem fi lunch crowd but mi nuh waan overcharge" },
    { index: 1, speaker: "Speaker B", text: "yuh can start wid food cost plus labour, den add delivery and likkle margin so it still fair" },
  ];
  const grade = gradeSegment(messages, { id: "segment-0", messageIndexes: [0, 1], topicLabel: "Conversation", boundaryConfidence: 1, boundaryReasons: [] });
  assert.ok(grade.dimensions.languageVariation.score >= 75);
  assert.ok(grade.dimensions.creativeCultural.score >= 80);
});

test("scores spelling variation without treating it as junk", () => {
  const messages = [
    { index: 0, speaker: "Speaker A", text: "plz check if this flyer copy gonna work 4 the weekend sale" },
    { index: 1, speaker: "Speaker B", text: "yeah it works, but make the discount and date clearer so people know when to come thru" },
  ];
  const grade = gradeSegment(messages, { id: "segment-0", messageIndexes: [0, 1], topicLabel: "Conversation", boundaryConfidence: 1, boundaryReasons: [] });
  assert.ok(grade.dimensions.languageVariation.score >= 75);
  assert.equal(grade.dimensions.languageVariation.source, "deterministic");
});

test("scores creative and cultural insight above generic conversation", () => {
  const messages = [
    { index: 0, speaker: "Speaker A", text: "I need a brand idea for a community reggae night that feels local, not corporate." },
    { index: 1, speaker: "Speaker B", text: "Call it Yard Signal and build the campaign around neighbour stories, sound system culture, and a proverb-style tagline." },
  ];
  const grade = gradeSegment(messages, { id: "segment-0", messageIndexes: [0, 1], topicLabel: "Conversation", boundaryConfidence: 1, boundaryReasons: [] });
  assert.ok(grade.dimensions.creativeCultural.score >= 80);
  assert.ok(grade.overallScore >= 60);
});

test("calculates tiered payout with multiplier", () => {
  const payout = calculateTieredPayout([
    { tier: "instructional", units: 1 },
    { tier: "language", units: 2 },
    { tier: "rejected", units: 4 },
  ], 2);
  assert.equal(payout.total, 500);
  assert.equal(payout.version, "c2c-payout-v6-mindwave-buyer");
  assert.equal(payout.maxRatePerPair, 200);
});

test("uses the MindWave v6 buyer rates for every accepted tier", () => {
  const payout = calculateTieredPayout([
    { tier: "instructional", units: 1 },
    { tier: "contextual", units: 1 },
    { tier: "language", units: 1 },
    { tier: "creative", units: 1 },
    { tier: "conversational", units: 1 },
    { tier: "rejected", units: 1 },
  ]);
  assert.deepEqual(payout.breakdown.map((item) => item.rate), [100, 50, 75, 25, 25, 0]);
  assert.equal(payout.total, 275);
  assert.equal(calculateTieredPayout([{ tier: "instructional", units: 1 }], 2).total, 200);
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
