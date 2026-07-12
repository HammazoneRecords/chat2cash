export const SEGMENTATION_VERSION = "c2c-segmentation-v1";
export const EVALUATOR_VERSION = "c2c-evaluator-v1";
export const PAYOUT_VERSION = "c2c-payout-v2-mindwave-buyer";

export type NormalizedMessage = {
  index: number;
  speaker: string;
  text: string;
  gapBucket?: "short" | "medium" | "long";
};

export type ConversationSegment = {
  id: string;
  messageIndexes: number[];
  topicLabel: string;
  boundaryConfidence: number;
  boundaryReasons: string[];
};

const topicMarkers = /\b(anyway|separately|new topic|by the way|changing subject|also|unrelated|different matter)\b/i;

function tokens(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(t => t.length > 3));
}

function similarity(a: string, b: string): number {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared++;
  return shared / Math.max(left.size, right.size);
}

export function segmentConversation(messages: NormalizedMessage[]): ConversationSegment[] {
  if (!messages.length) return [];
  const segments: ConversationSegment[] = [];
  let current: ConversationSegment = {
    id: "segment-0",
    messageIndexes: [messages[0].index],
    topicLabel: "Conversation",
    boundaryConfidence: 1,
    boundaryReasons: [],
  };

  for (let i = 1; i < messages.length; i++) {
    const previous = messages[i - 1];
    const message = messages[i];
    const reasons: string[] = [];
    if (message.gapBucket === "long") reasons.push("long inactivity gap");
    if (topicMarkers.test(message.text)) reasons.push("explicit topic marker");
    if (similarity(previous.text, message.text) < 0.04 && message.gapBucket !== "short") {
      reasons.push("low lexical continuity");
    }

    if (reasons.length >= 2) {
      current.boundaryConfidence = Math.min(0.99, 0.55 + reasons.length * 0.15);
      current.boundaryReasons = reasons;
      segments.push(current);
      current = {
        id: `segment-${segments.length}`,
        messageIndexes: [message.index],
        topicLabel: "Conversation",
        boundaryConfidence: 1,
        boundaryReasons: [],
      };
    } else {
      current.messageIndexes.push(message.index);
    }
  }
  segments.push(current);
  return segments;
}

export type ScoreDimension = {
  score: number;
  confidence: number;
  evidence: number[];
  source: "deterministic" | "ai" | "moderator";
};

export type MultiFactorGrade = {
  dimensions: Record<string, ScoreDimension>;
  overallScore: number;
  confidence: number;
  evaluatorVersion: string;
};

export function gradeSegment(messages: NormalizedMessage[], segment: ConversationSegment): MultiFactorGrade {
  const selected = messages.filter(m => segment.messageIndexes.includes(m.index));
  const wordCount = selected.reduce((sum, m) => sum + m.text.split(/\s+/).filter(Boolean).length, 0);
  const hasQuestion = selected.some(m => m.text.includes("?"));
  const hasFollowup = selected.length >= 3;
  const dimensions: Record<string, ScoreDimension> = {
    instructional: { score: hasQuestion && wordCount >= 20 ? 80 : 45, confidence: 0.55, evidence: segment.messageIndexes, source: "deterministic" },
    contextCoherence: { score: segment.boundaryConfidence < 0.7 ? 55 : 75, confidence: 0.5, evidence: segment.messageIndexes, source: "deterministic" },
    languageVariation: { score: wordCount >= 12 ? 65 : 35, confidence: 0.45, evidence: segment.messageIndexes, source: "deterministic" },
    followupValue: { score: hasFollowup ? 70 : 35, confidence: 0.45, evidence: segment.messageIndexes, source: "deterministic" },
    creativeCultural: { score: 50, confidence: 0.25, evidence: segment.messageIndexes, source: "deterministic" },
    safetyPrivacy: { score: 100, confidence: 0.8, evidence: segment.messageIndexes, source: "deterministic" },
  };
  const values = Object.values(dimensions);
  return {
    dimensions,
    overallScore: Math.round(values.reduce((sum, item) => sum + item.score, 0) / values.length),
    confidence: Math.round(values.reduce((sum, item) => sum + item.confidence, 0) / values.length * 100) / 100,
    evaluatorVersion: EVALUATOR_VERSION,
  };
}

export type ContextSignal = {
  fromMessage: number;
  toMessage: number;
  kind: "clarification" | "contradiction" | "reversal" | "followup";
  confidence: number;
  evidence: string;
};

const reversalMarkers = /\b(actually|not exactly|i meant|what i meant|forget that|instead|but no|correction|wrong|to be clear|however)\b/i;
const contradictionMarkers = /\b(no|not|never|isn't|aren't|can't|cannot|that's false|that is false|however)\b/i;

export function detectContextSignals(messages: NormalizedMessage[]): ContextSignal[] {
  const signals: ContextSignal[] = [];
  for (let i = 1; i < messages.length; i++) {
    const previous = messages[i - 1];
    const current = messages[i];
    const text = current.text;
    if (reversalMarkers.test(text) || contradictionMarkers.test(text)) {
      signals.push({
        fromMessage: previous.index,
        toMessage: current.index,
        kind: /wrong|not exactly|forget|instead/i.test(text) ? "reversal"
          : /no|never|isn't|aren't|can't|cannot|false|however/i.test(text) ? "contradiction" : "clarification",
        confidence: /wrong|not exactly|forget|instead|false/i.test(text) ? 0.86 : 0.72,
        evidence: text.slice(0, 240),
      });
    } else if (text.includes("?") && i + 1 < messages.length) {
      signals.push({
        fromMessage: current.index,
        toMessage: messages[i + 1].index,
        kind: "followup",
        confidence: 0.55,
        evidence: text.slice(0, 240),
      });
    }
  }
  return signals;
}

export type PayoutTier = "instructional" | "contextual" | "language" | "creative" | "conversational" | "rejected";

export const PAYOUT_RATES: Record<PayoutTier, number> = {
  instructional: 15,
  contextual: 5,
  language: 8,
  creative: 12,
  conversational: 2,
  rejected: 0,
};

export const MAX_PAYOUT_RATE_PER_PAIR = 20;

export function calculateTieredPayout(tiers: Array<{ tier: PayoutTier; units: number }>, multiplier = 1) {
  const breakdown = tiers.map(item => ({
    tier: item.tier,
    units: Math.max(0, Math.floor(item.units)),
    rate: PAYOUT_RATES[item.tier],
    effectiveRate: Math.min(PAYOUT_RATES[item.tier] * multiplier, MAX_PAYOUT_RATE_PER_PAIR),
    amount: Number((Math.max(0, Math.floor(item.units)) * Math.min(PAYOUT_RATES[item.tier] * multiplier, MAX_PAYOUT_RATE_PER_PAIR)).toFixed(2)),
  }));
  return {
    version: PAYOUT_VERSION,
    breakdown,
    multiplier,
    maxRatePerPair: MAX_PAYOUT_RATE_PER_PAIR,
    total: Number(breakdown.reduce((sum, item) => sum + item.amount, 0).toFixed(2)),
  };
}
