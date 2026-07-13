import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { createStaffInvite, listStaffUsers, updateStaffRole, setStaffDisabled, isUserDisabled, consumeStaffInvite, revokeUserSessions } from "./lib/auth";
import { database } from "./db";
import { hashPair } from "./lib/contentHash";
import { validateCanonicalJson, hashCanonicalDialogues } from "./lib/canonicalJson";
import { segmentConversation, gradeSegment, detectContextSignals, calculateTieredPayout, SEGMENTATION_VERSION, EVALUATOR_VERSION, PAYOUT_VERSION, type PayoutTier } from "./lib/contextGrading";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "4001");

// Shared secret keys
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID; // Oreluwa endpoint
const WIPAY_ACCOUNT_NUMBER = process.env.WIPAY_ACCOUNT_NUMBER || "1234567";
const WIPAY_MERCHANT_KEY = process.env.WIPAY_MERCHANT_KEY || "";
const WIPAY_COUNTRY_CODE = process.env.WIPAY_COUNTRY_CODE || "JM";

// Admin picture-password config
const ADMIN_CLICK_SEQUENCE: string[] = JSON.parse(process.env.ADMIN_CLICK_SEQUENCE || '["V1","V3","V2","V1","V3"]');
const ADMIN_PASSPHRASE = process.env.ADMIN_PASSPHRASE || "";
// Temp tokens: token → { expires: timestamp }
const adminTempTokens = new Map<string, number>();
// Rate limiting: IP → { count, resetAt }
const adminAttempts = new Map<string, { count: number; resetAt: number }>();

const AI_PROVIDER = RUNPOD_API_KEY && RUNPOD_ENDPOINT_ID
  ? "oreluwa"
  : DEEPSEEK_API_KEY
    ? "deepseek"
    : "local";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ALLOWED_PROFILE_COUNTRIES = new Set(["JM", "TT", "BB", "US"]);
const ALLOWED_GENDERS = new Set(["female", "male", "non-binary", "prefer-not-to-say", "other", "intersex (formerly referred to locally as hermaphrodite)"]);
const MAX_ID_PHOTO_BYTES = 2_000_000;

console.log(`[AI] Evaluation provider: ${AI_PROVIDER.toUpperCase()}`);
const MAX_AI_PROMPT_CHARS = 24000;

function cleanText(value: any, max = 120) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function sanitizeProfileForClient(profile: any) {
  if (!profile) return profile;
  const { idPhoto, ...safeProfile } = profile;
  return {
    ...safeProfile,
    idPhotoVerified: Boolean(idPhoto),
  };
}

function validateProfilePayload(body: any) {
  const phone = cleanText(body.phone, 32);
  const wipayAccount = cleanText(body.wipayAccount, 64);
  const wipayLink = cleanText(body.wipayLink, 240);
  const country = cleanText(body.country || "JM", 8).toUpperCase();
  const town = cleanText(body.town, 80);
  const age = Number(body.age);
  const gender = cleanText(body.gender, 40).toLowerCase();
  const educationLevel = cleanText(body.educationLevel, 80);
  const school = cleanText(body.school, 120);
  const singleParentHome = Boolean(body.singleParentHome);
  const demographicOptIn = Boolean(body.demographicOptIn);
  const idPhoto = String(body.idPhoto || "");

  if (!phone || !/^[+\d()\-\s]{7,32}$/.test(phone)) {
    return { error: "Enter a valid phone number." };
  }
  if (!wipayAccount || !/^[a-zA-Z0-9_.\- ]{3,64}$/.test(wipayAccount)) {
    return { error: "Enter a valid WiPay account reference." };
  }
  try {
    const url = new URL(wipayLink);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("bad protocol");
  } catch {
    return { error: "Enter a valid WiPay payout link." };
  }
  if (!ALLOWED_PROFILE_COUNTRIES.has(country)) {
    return { error: "Select a supported country." };
  }
  if (!town || town.length < 2) {
    return { error: "Enter your town or parish." };
  }
  if (!Number.isInteger(age) || age < 18 || age > 100) {
    return { error: "Age must be between 18 and 100." };
  }
  if (!ALLOWED_GENDERS.has(gender)) {
    return { error: "Select a supported gender option." };
  }

  let idPhotoMarker = "";
  if (demographicOptIn) {
    const match = idPhoto.match(/^data:image\/(jpeg|jpg|png|webp);base64,([a-zA-Z0-9+/=]+)$/);
    if (!match) {
      return { error: "Upload a redacted JPG, PNG, or WebP ID image for the multiplier check." };
    }
    const byteLength = Buffer.byteLength(match[2], "base64");
    if (byteLength <= 0 || byteLength > MAX_ID_PHOTO_BYTES) {
      return { error: "Redacted ID image must be under 2MB." };
    }
    const digest = crypto.createHash("sha256").update(match[2]).digest("hex");
    idPhotoMarker = `verified-hash:v1:${digest}`;
  }

  return {
    profile: {
      phone,
      wipayAccount,
      wipayLink,
      country,
      town,
      age,
      gender,
      educationLevel: educationLevel || null,
      school: school || null,
      singleParentHome: singleParentHome ? 1 : 0,
      demographicOptIn: demographicOptIn ? 1 : 0,
      idPhoto: idPhotoMarker,
    },
  };
}

// Cascading AI evaluator: Oreluwa (RunPod) → DeepSeek → local heuristics
async function runAIEvaluation(prompt: string): Promise<any | null> {
  // Tier 1 — Oreluwa on RunPod (self-hosted, cost-efficient at scale)
  if (RUNPOD_API_KEY && RUNPOD_ENDPOINT_ID) {
    try {
      const res = await fetch(
        `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/runsync`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RUNPOD_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: {
              messages: [{ role: "user", content: prompt }],
              max_tokens: 2000,
              response_format: { type: "json_object" },
            },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json() as any;
        const raw = data.output?.choices?.[0]?.message?.content || data.output;
        return JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
      }
    } catch (e) {
      console.warn("[AI] Oreluwa/RunPod failed, falling back to DeepSeek:", e);
    }
  }

  // Tier 2 — DeepSeek direct API
  if (DEEPSEEK_API_KEY) {
    try {
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 2000,
        }),
      });
      if (res.ok) {
        const data = await res.json() as any;
        return JSON.parse(data.choices[0].message.content);
      }
    } catch (e) {
      console.warn("[AI] DeepSeek failed, using local heuristics:", e);
    }
  }

  // Tier 3 — local heuristics (handled by caller returning null)
  return null;
}

// SQLite database (chat2cash.db) initialized in db.ts with schema and WAL mode
// All data operations are transactional and concurrent-safe

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  if (IS_PRODUCTION) {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
  }
  next();
});

function bodyLimitForPath(pathname: string) {
  if (["/api/process-chat", "/api/upload-json", "/api/submit-json-draft"].includes(pathname)) return "50mb";
  if (pathname === "/api/profile/update") return "6mb";
  return "1mb";
}

function formatBodyParserError(error: any) {
  if (error?.type === "entity.too.large") return { status: 413, message: "Payload is too large for this endpoint." };
  return { status: 400, message: "Invalid request body." };
}

app.use((req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const limit = bodyLimitForPath(req.path);
  express.json({ limit })(req, res, (jsonError) => {
    if (jsonError) {
      const formatted = formatBodyParserError(jsonError);
      return res.status(formatted.status).json({ error: formatted.message });
    }
    express.urlencoded({ limit, extended: true })(req, res, (urlError) => {
      if (urlError) {
        const formatted = formatBodyParserError(urlError);
        return res.status(formatted.status).json({ error: formatted.message });
      }
      next();
    });
  });
});

const configuredOrigins = [
  process.env.APP_URL,
  process.env.BETTER_AUTH_URL,
  "http://localhost:4001",
  "http://127.0.0.1:4001",
].filter(Boolean) as string[];

app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (!origin) return next();
  const hostOrigin = `${req.protocol}://${req.get("host")}`;
  if (origin === hostOrigin || configuredOrigins.includes(origin)) return next();
  return res.status(403).json({ error: "Invalid request origin." });
});

// Simple rate limiter (in-memory; not suitable for multi-process)
// For production: use redis-rate-limiter or equivalent
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute per IP

function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (record && now < record.resetAt) {
    record.count++;
    if (record.count > RATE_LIMIT_MAX) {
      return res.status(429).json({ error: "Rate limit exceeded. Please wait before making more requests." });
    }
  } else {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
  }

  next();
}

app.use(rateLimit);

// Better Auth — handles all /api/auth/* routes (signup, signin, signout, session)
app.all("/api/auth/*", toNodeHandler(auth));

// Session middleware — attaches session to req for protected routes
async function requireSession(req: any, res: express.Response, next: express.NextFunction) {
  const session = await auth.api.getSession({ headers: req.headers as any });
  if (!session) {
    return res.status(401).json({ error: "Authentication required. Please sign in." });
  }
  if (isUserDisabled(session.user.id)) return res.status(403).json({ error: "Account disabled." });
  req.session = session;
  next();
}

async function requireAdmin(req: any, res: express.Response, next: express.NextFunction) {
  const session = await auth.api.getSession({ headers: req.headers as any });
  if (!session) {
    return res.status(401).json({ error: "Authentication required." });
  }
  if (isUserDisabled(session.user.id)) {
    return res.status(403).json({ error: "Account disabled." });
  }
  if (!["admin", "owner"].includes(session.user.role || "")) {
    return res.status(403).json({ error: "Admin access required." });
  }
  req.session = session;
  next();
}

function requireRole(...roles: string[]) {
  return async (req: any, res: express.Response, next: express.NextFunction) => {
    const session = await auth.api.getSession({ headers: req.headers as any });
    if (!session) return res.status(401).json({ error: "Authentication required." });
    if (isUserDisabled(session.user.id)) return res.status(403).json({ error: "Account disabled." });
    if (!roles.includes(session.user.role || "contributor")) {
      return res.status(403).json({ error: "Insufficient permissions." });
    }
    req.session = session;
    next();
  };
}

// --- API Endpoints ---

// Current session user + profile — used to restore session on page load
app.get("/api/me", requireSession, (req: any, res) => {
  const userId = req.session.user.id;
  const user = database.getProfile(userId);
  if (!user) {
    return res.status(404).json({ error: "Profile not found." });
  }
  res.json({ user: sanitizeProfileForClient(user) });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Get system configuration details
app.get("/api/config", (req, res) => {
  res.json({
    status: "ok",
    wipayConfigured: !!process.env.WIPAY_MERCHANT_KEY,
    aiConfigured: AI_PROVIDER !== "local",
    aiProvider: AI_PROVIDER,
    wipayCountryCode: WIPAY_COUNTRY_CODE,
  });
});

// Profile update — called after Better Auth signUp to save contributor-specific fields
app.post("/api/profile/update", requireSession, (req: any, res) => {
  const userId = req.session.user.id;
  const validated = validateProfilePayload(req.body);
  if ("error" in validated) {
    return res.status(400).json({ error: validated.error });
  }

  try {
    database.updateProfile(userId, validated.profile);

    const user = database.getProfile(userId);
    res.json({ success: true, user: sanitizeProfileForClient(user) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Profile update failed." });
  }
});

// Legacy registration endpoint — disabled. Better Auth session ownership is required.
app.post("/api/profile", (req, res) => {
  return res.status(410).json({ error: "Legacy profile creation is disabled. Please use the authenticated registration flow." });
});

// Fetch detailed database statistics & transaction history for reconciliation
app.get("/api/reconciliation", (req, res) => {
  const datasets = database.getAllDatasets().map((dataset: any) => ({
    id: dataset.id,
    userId: `anon-${String(dataset.id).slice(-6)}`,
    userEmail: "anonymous-contributor",
    userPhone: "",
    originalFileName: "sanitized-chat-export",
    purifiedFileName: dataset.purifiedFileName,
    timestamp: dataset.timestamp,
    status: dataset.status,
    payoutAmount: dataset.payoutAmount,
    currency: dataset.currency,
    contentHash: dataset.contentHash || dataset.metadata?.contentHash || "",
    hashVersion: dataset.hashVersion || dataset.metadata?.hashVersion || "v1",
    metadata: {
      jsonVersion: dataset.metadata?.jsonVersion,
      evaluatorVersion: dataset.metadata?.evaluatorVersion,
      segmentationVersion: dataset.metadata?.segmentationVersion,
      suitabilityScore: dataset.metadata?.suitabilityScore,
      totalLinesAnalyzed: dataset.metadata?.totalLinesAnalyzed,
      totalUsefulLines: dataset.metadata?.totalUsefulLines,
      payout: dataset.metadata?.payout,
      publicReceipt: true,
    },
    dialogues: [],
    originalLinesPreview: [],
  }));

  res.json({
    stats: database.getStats(),
    datasets,
    profiles: [],
    transactions: [],
  });
});

// Public stats — total chats, messages, JMD paid out
app.get("/api/stats", (req, res) => {
  try {
    res.json(database.getStats());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Voice notes waitlist signup
app.post("/api/waitlist", (req, res) => {
  const { name, email, town, country, age } = req.body;
  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: "Name and email are required." });
  }
  try {
    database.addToWaitlist({ name: name.trim(), email: email.trim(), town: town || "", country: country || "JM", age: String(age || "") });
    res.json({ success: true, message: "You're on the list. First to know when voice notes launch." });
  } catch (err: any) {
    if (err.message?.includes("UNIQUE constraint")) {
      return res.status(409).json({ error: "This email is already on the waitlist." });
    }
    res.status(500).json({ error: err.message || "Failed to join waitlist." });
  }
});

// Reviewed JSON upload — validates and returns a non-persisted draft.
app.post("/api/upload-json", requireSession, (req: any, res) => {
  try {
    const profile = database.getProfile(req.session.user.id);
    if (!profile) return res.status(404).json({ error: "Profile not found." });

    const { dialogues, warnings } = validateCanonicalJson(req.body);
    const canonicalHash = hashCanonicalDialogues(dialogues);
    const existingDataset = database.getDatasetByContentHash(canonicalHash);
    const jsonPairHashes = dialogues.map((dialogue) =>
      hashPair("canonical-pair", `${dialogue.prompt}\n${dialogue.response}`),
    );
    const existingPairHashes = database.getExistingPairHashes(jsonPairHashes);
    const duplicatePreview = existingDataset
      ? {
        status: existingDataset.userId === req.session.user.id ? "already_submitted_by_you" : "exact_duplicate",
        matchedPairs: jsonPairHashes.length,
        totalPairs: jsonPairHashes.length,
        wouldStrikeOnSubmit: existingDataset.userId !== req.session.user.id,
        message: existingDataset.userId === req.session.user.id
          ? "This anonymized dataset was already submitted by your account. Submitting again will restore the existing receipt instead of creating a new payout."
          : "This anonymized dataset was already submitted by another account. Submitting it would add a duplicate strike.",
      }
      : existingPairHashes.length > 0
        ? {
          status: existingPairHashes.length === jsonPairHashes.length ? "all_pairs_duplicate" : "partial_duplicate",
          matchedPairs: existingPairHashes.length,
          totalPairs: jsonPairHashes.length,
          wouldStrikeOnSubmit: existingPairHashes.length === jsonPairHashes.length,
          message: existingPairHashes.length === jsonPairHashes.length
            ? "All dialogue pairs in this reviewed JSON were already received. Submitting it would add a duplicate strike."
            : `${existingPairHashes.length} of ${jsonPairHashes.length} dialogue pairs were already received. Submitting will keep only new dialogue pairs.`,
        }
        : {
          status: "clean",
          matchedPairs: 0,
          totalPairs: jsonPairHashes.length,
          wouldStrikeOnSubmit: false,
          message: "No duplicate dialogue pairs detected in preview.",
        };
    const normalizedMessages = dialogues.flatMap((dialogue, index) => [
      { index: index * 2, speaker: "Speaker A", text: dialogue.prompt },
      { index: index * 2 + 1, speaker: "Speaker B", text: dialogue.response },
    ]);
    const segments = segmentConversation(normalizedMessages);
    const grades = segments.map(segment => ({ segment, grade: gradeSegment(normalizedMessages, segment) }));
    const contextSignals = detectContextSignals(normalizedMessages);
    const tierInputs = grades.map(({ grade }) => ({
      tier: grade.dimensions.instructional.score >= 70 ? "instructional" as const
        : grade.dimensions.followupValue.score >= 60 ? "contextual" as const
          : grade.dimensions.languageVariation.score >= 55 ? "language" as const
            : "conversational" as const,
      units: 1,
    }));
    const payout = calculateTieredPayout(tierInputs, profile.demographicOptIn ? 2 : 1);
    const draft = {
      id: `DRAFT-${canonicalHash.slice(0, 16)}`,
      userId: req.session.user.id,
      userEmail: "",
      userPhone: "",
      originalFileName: "reviewed-upload.json",
      purifiedFileName: `chat2cash_${req.session.user.id}_${canonicalHash.slice(0, 12)}.json`,
      timestamp: new Date().toISOString(),
      status: "Draft",
      payoutAmount: payout.total,
      currency: profile.country === "JM" ? "JMD" : profile.country === "BB" ? "BBD" : "TTD",
      contentHash: canonicalHash,
      metadata: {
        jsonVersion: "c2c-json-v1",
        evaluatorVersion: EVALUATOR_VERSION,
        segmentationVersion: SEGMENTATION_VERSION,
        payoutVersion: PAYOUT_VERSION,
        anonymizationRules: ["Validated canonical anonymized JSON", "Client scores and identity fields ignored"],
        warnings,
        duplicatePreview,
        totalLinesAnalyzed: dialogues.length * 2,
        totalUsefulLines: 0,
        suitabilityScore: null,
        segments,
        grades,
        contextSignals,
        payout,
      },
      dialogues: dialogues.map((d, index) => ({
        id: `draft-${index}`,
        ...d,
        isUseful: false,
        score: null,
        category: "Pending Context Review",
      })),
      originalLinesPreview: [],
    };
    res.json({ success: true, draft });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Invalid canonical JSON." });
  }
});

// Explicitly submit a reviewed JSON draft. Scores and identity are recomputed server-side.
app.post("/api/submit-json-draft", requireSession, (req: any, res) => {
  try {
    const userId = req.session.user.id;
    const profile = database.getProfile(userId);
    if (!profile) return res.status(404).json({ error: "Profile not found." });

    const { dialogues } = validateCanonicalJson(req.body);
    const contentHash = hashCanonicalDialogues(dialogues);
    const existing = database.getDatasetByContentHash(contentHash);
    if (existing?.userId === userId) {
      return res.json({ success: true, idempotent: true, dataset: existing });
    }
    if (existing) {
      const { strikes, flagged } = database.addStrike(userId);
      database.addAuditLog("duplicate_detected", null, userId, `Reviewed JSON full duplicate — strike ${strikes}/4${flagged ? " — ACCOUNT FLAGGED" : ""}`);
      return res.status(409).json({
        error: "duplicate",
        message: "This anonymized dataset was already submitted by another account.",
        strikes,
        accountFlagged: flagged,
      });
    }

    const jsonPairHashes = dialogues.map((dialogue) =>
      hashPair("canonical-pair", `${dialogue.prompt}\n${dialogue.response}`),
    );
    const existingPairHashes = database.getExistingPairHashes(jsonPairHashes);
    if (existingPairHashes.length === jsonPairHashes.length && jsonPairHashes.length > 0) {
      const { strikes, flagged } = database.addStrike(userId);
      database.addAuditLog("duplicate_detected", null, userId, `Reviewed JSON all-pairs duplicate — strike ${strikes}/4${flagged ? " — ACCOUNT FLAGGED" : ""}`);
      return res.status(409).json({
        error: "duplicate",
        message: "All submitted dialogue pairs have already been received.",
        strikes,
        accountFlagged: flagged,
      });
    }
    const existingPairSet = new Set(existingPairHashes);
    const unseenIndices = jsonPairHashes
      .map((pairHash, index) => existingPairSet.has(pairHash) ? -1 : index)
      .filter(index => index >= 0);
    const submittedDialogues = unseenIndices.map(index => dialogues[index]);
    const submittedPairHashes = unseenIndices.map(index => jsonPairHashes[index]);
    const duplicateStatus = existingPairHashes.length > 0 ? "partial" : "clean";
    const normalizedMessages = submittedDialogues.flatMap((dialogue, index) => [
      { index: index * 2, speaker: "Speaker A", text: dialogue.prompt.replace(/^\[[^\]]+\]:\s*/, ""), gapBucket: "short" as const },
      { index: index * 2 + 1, speaker: "Speaker B", text: dialogue.response.replace(/^\[[^\]]+\]:\s*/, ""), gapBucket: "short" as const },
    ]);
    const segments = segmentConversation(normalizedMessages);
    const grades = segments.map(segment => ({ segment, grade: gradeSegment(normalizedMessages, segment) }));
    const contextSignals = detectContextSignals(normalizedMessages);
    const gradedDialogues = submittedDialogues.map((d, index) => ({
      id: `dialogue-${index}`,
      ...d,
      isUseful: false,
      score: 20,
      category: "Contextual Conversation",
      explanation: "Server recomputed from reviewed anonymized JSON.",
    }));
    applyContextAwareDialogueLabels(gradedDialogues, grades);
    const totalUsefulLines = gradedDialogues.filter((dialogue: any) => dialogue.isUseful).length;
    const suitabilityScore = grades.length
      ? Math.round(grades.reduce((sum, entry) => sum + (entry.grade?.overallScore || 0), 0) / grades.length)
      : 0;
    const tierInputs = buildDialoguePayoutInputs(gradedDialogues, grades);
    const payout = calculateTieredPayout(tierInputs, profile.demographicOptIn ? 2 : 1);
    const payoutAmount = payout.total;
    const ratePerPair = averageAcceptedRate(payout);
    const datasetId = `DS-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const dataset: any = {
      id: datasetId,
      userId,
      userEmail: profile.email,
      userPhone: profile.phone,
      originalFileName: "reviewed-upload.json",
      purifiedFileName: `whatsapp_dataset_${userId}_${Date.now()}.json`,
      timestamp,
      status: "Pending Review",
      payoutAmount,
      currency: profile.country === "JM" ? "JMD" : profile.country === "BB" ? "BBD" : "TTD",
      contentHash,
      hashVersion: "v1",
      metadata: {
        jsonVersion: "c2c-json-v1",
        evaluatorVersion: EVALUATOR_VERSION,
        segmentationVersion: SEGMENTATION_VERSION,
        payoutVersion: PAYOUT_VERSION,
        contentHash,
        hashVersion: "v1",
        anonymizationRules: ["Canonical anonymized JSON validated server-side"],
        evaluationSummary: "Reviewed JSON recomputed with context-aware grading before submission.",
        suitabilityScore,
        payoutRatePerUsefulLine: ratePerPair,
        totalLinesAnalyzed: submittedDialogues.length * 2,
        totalUsefulLines,
        partialDuplicate: duplicateStatus === "partial",
        newPairsOnly: submittedDialogues.length,
        uniqueUserTokens: Math.round(submittedDialogues.length * 2 * 4.8),
        estimatedTokens: Math.round(submittedDialogues.length * 2 * 15.2),
        segments,
        grades,
        contextSignals,
        payout,
      },
      dialogues: gradedDialogues,
    };

    database.createDataset(dataset);
    database.insertPairHashes(submittedPairHashes, datasetId, userId);
    database.updateDatasetHash(datasetId, contentHash, duplicateStatus);
    return res.status(201).json({
      success: true,
      dataset: database.getDataset(datasetId),
      ...(duplicateStatus === "partial" ? {
        warning: "partial_duplicate",
        message: "Some dialogue pairs were already submitted. This dataset contains only new pairs.",
      } : {}),
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Draft submission failed." });
  }
});

// Helper: Securely strip timestamps, contact numbers, and person names locally
function sanitizeWhatsAppChatLocal(chatText: string) {
  const lines = chatText.split(/\r?\n/);
  const purifiedDialogue: { speaker: string; text: string; originalLine: string }[] = [];
  
  // Regex mapping for common WhatsApp formats
  // Format 1: [10/18/22, 10:14:45 AM] Ovando: Hello!
  // Format 2: 10/18/22, 10:14 AM - Ovando: Hello!
  // Format 3: 18/06/2026, 22:15 - Ovando: Hello!
  const wappRegex1 = /^\[\d{1,2}\/\d{1,2}\/\d{2,4},\s+\d{1,2}:\d{2}(:\d{2})?(\s+[AP]M)?\]\s+([^:]+):\s*(.*)$/i;
  const wappRegex2 = /^\d{1,2}\/\d{1,2}\/\d{2,4},\s+\d{1,2}:\d{2}(\s+[AP]M)?\s+-\s+([^:]+):\s*(.*)$/i;
  const wappRegex3 = /^\[\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}:\d{2}\]\s+([^:]+):\s*(.*)$/;
  
  // Keep track of participant to speaker tag pseudonym maps (e.g. "+18685121212" -> "Speaker A")
  const speakerMap = new Map<string, string>();
  let speakerCounter = 65; // ASCII 'A'
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    let match = line.match(wappRegex1) || line.match(wappRegex2) || line.match(wappRegex3);
    
    if (match) {
      // Find where indices are
      let sender = "";
      let text = "";
      
      if (line.match(wappRegex1)) {
        sender = match[3]?.trim();
        text = match[4]?.trim();
      } else if (line.match(wappRegex2)) {
        sender = match[2]?.trim();
        text = match[3]?.trim();
      } else {
        sender = match[1]?.trim();
        text = match[2]?.trim();
      }
      
      // Filter out system automated logs (e.g. "Messages you send", "You added", "security code changed")
      if (
        sender.includes("security code") ||
        sender.includes("joined using") ||
        text.includes("Messages and calls are end-to-end encrypted") ||
        text.includes("omitted")
      ) {
        continue;
      }
      
      // Map sender names or phone numbers to pseudonyms securely
      let pseudonym = speakerMap.get(sender);
      if (!pseudonym) {
        const uppercaseLetter = String.fromCharCode(speakerCounter);
        pseudonym = `Speaker ${uppercaseLetter}`;
        speakerMap.set(sender, pseudonym);
        
        // Cycle Speakers A-Z
        speakerCounter++;
        if (speakerCounter > 90) { // Wrap around if there are more than 26 speakers
          speakerCounter = 65;
        }
      }
      
      // Completely strip sub-patterns like physical phone numbers in text (e.g. +1 868-555-5555)
      const sanitizedText = text
        .replace(/\+?\d{1,4}[\s-]?\(?\d{2,3}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/g, "[Phone Redacted]")
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[Email Redacted]");
        
      purifiedDialogue.push({
        speaker: pseudonym,
        text: sanitizedText,
        originalLine: line,
      });
    }
  }
  
  return purifiedDialogue;
}

// Helper: Local Rule-Based Pre-Filtering Script for Cost Optimization and Accuracy
function evaluateDialogueLocally(d: { prompt: string; response: string }) {
  const pLower = d.prompt.toLowerCase();
  const rLower = d.response.toLowerCase();
  
  // 1. System messages / automated omitted indicators
  if (pLower.includes("omitted") || rLower.includes("omitted") || 
      pLower.includes("deleted this message") || rLower.includes("deleted this message") || 
      pLower.includes("missed voice call") || rLower.includes("missed voice call")) {
    return {
      isUseful: false,
      score: 10,
      category: "Noise",
      explanation: "Local Rule: System alert or omitted media notification."
    };
  }

  // 2. Laugh loop noise patterns
  const laughRegex = /\b(lol|lmao|rotfl|haha|hehe|giggle|😂|😭|😹)\b/i;
  if (laughRegex.test(pLower) || laughRegex.test(rLower)) {
    return {
      isUseful: false,
      score: 15,
      category: "Noise",
      explanation: "Local Rule: Informal laugh pattern or chat text noise detected."
    };
  }

  // 3. Short greetings / generic short acknowledgments filter
  const greetings = [
    "hi", "hello", "hey", "yo", "good morning", "goodnight", 
    "good evening", "good day", "wassup", "bless", "bye", 
    "thanks", "thank you", "ok", "okay", "cool", "yes", "no"
  ];
  
  const cleanPromptText = pLower.replace(/^\[[^\]]+\]:\s*/, "").trim();
  const cleanResponseText = rLower.replace(/^\[[^\]]+\]:\s*/, "").trim();
  const promptWords = cleanPromptText.split(/\s+/).filter(Boolean);
  const responseWords = cleanResponseText.split(/\s+/).filter(Boolean);
  
  if (promptWords.length <= 1 || responseWords.length <= 1) {
    return {
      isUseful: false,
      score: 12,
      category: "Noise",
      explanation: "Local Rule: Dialogue turn is single word or empty filler."
    };
  }

  const isPromptGreeting = promptWords.length <= 3 && greetings.some(g => cleanPromptText === g || cleanPromptText.startsWith(g + " "));
  const isResponseGreeting = responseWords.length <= 3 && greetings.some(g => cleanResponseText === g || cleanResponseText.startsWith(g + " "));
  if (isPromptGreeting && isResponseGreeting) {
    return {
      isUseful: false,
      score: 15,
      category: "Greetings",
      explanation: "Local Rule: Conversational greetings or standard salutations."
    };
  }

  // 4. Regional slang / untranslatable patois local dictionary check
  const regionalSlang = ["bredrin", "gyal", "bumboclaat", "rasclat", "unnu", "gwan", "deh mi", "bwoy", "skettel"];
  const hasSlangPrompt = regionalSlang.some(slang => pLower.includes(slang));
  const hasSlangResponse = regionalSlang.some(slang => rLower.includes(slang));
  if ((hasSlangPrompt && promptWords.length < 5) || (hasSlangResponse && responseWords.length < 5)) {
    return {
      isUseful: false,
      score: 20,
      category: "Untranslatable Patois",
      explanation: "Local Rule: Non-standard heavy Caribbean dialect pattern."
    };
  }

  // 5. Check if it is a high-confidence informational or task-oriented turn
  // If it's a long healthy turn with instructional prefixes or questions
  const queryWords = ["how", "why", "what", "explain", "where", "when", "can you", "should", "guide", "step", "recipe", "need to"];
  const isQuestion = cleanPromptText.includes("?") || cleanResponseText.includes("?");
  const hasQueryWord = queryWords.some(qw => pLower.includes(qw) || rLower.includes(qw));
  
  if (promptWords.length >= 8 && responseWords.length >= 8 && (isQuestion || hasQueryWord)) {
    return {
      isUseful: true,
      score: 95,
      category: "Task-oriented",
      explanation: "Local Rule: Highly detailed query with structural context."
    };
  }

  // If word count is substantial, we have a good informational exchange candidate
  if (promptWords.length >= 7 && responseWords.length >= 7) {
    return {
      isUseful: true,
      score: 85,
      category: "Informational",
      explanation: "Local Rule: Long-form conversational dialogue exchange."
    };
  }

  // Otherwise, we flag it as an "ambiguous" dialogue turn that requires LLM check
  return null;
}

function applyContextAwareDialogueLabels(dialogues: any[], grades: any[]) {
  const gradeByMessageIndex = new Map<number, any>();
  grades.forEach((entry: any) => {
    (entry.segment?.messageIndexes || []).forEach((messageIndex: number) => {
      gradeByMessageIndex.set(messageIndex, entry.grade);
    });
  });

  dialogues.forEach((dialogue, idx) => {
    const messageIndexes = [idx * 2, idx * 2 + 1];
    const segmentGrades = messageIndexes
      .map(messageIndex => gradeByMessageIndex.get(messageIndex))
      .filter(Boolean);
    if (!segmentGrades.length) return;

    const bestGrade = segmentGrades.reduce((best: any, current: any) =>
      (current.overallScore || 0) > (best.overallScore || 0) ? current : best,
    );
    const followupScore = bestGrade.dimensions?.followupValue?.score || 0;
    const languageScore = bestGrade.dimensions?.languageVariation?.score || 0;
    const coherenceScore = bestGrade.dimensions?.contextCoherence?.score || 0;
    const isHardReject = /system alert|omitted media|deleted this message|missed voice call/i.test(dialogue.explanation || "");

    if (!isHardReject && !dialogue.isUseful && (followupScore >= 60 || languageScore >= 55 || coherenceScore >= 70 || bestGrade.overallScore >= 58)) {
      dialogue.isUseful = true;
      dialogue.score = Math.max(dialogue.score || 0, Math.min(88, bestGrade.overallScore || 70));
      dialogue.category = followupScore >= 60 ? "Contextual Follow-up" : "Contextual Conversation";
      dialogue.explanation = `Context-aware grade: relevant within ${bestGrade.evaluatorVersion || EVALUATOR_VERSION}; preserved as useful context instead of isolated noise.`;
    }
  });
}

function payoutTierForDialogue(dialogue: any, dialogueIndex: number, grades: any[]): PayoutTier {
  if (!dialogue?.isUseful) return "rejected";
  const messageIndexes = [dialogueIndex * 2, dialogueIndex * 2 + 1];
  const segmentGrades = grades
    .filter((entry: any) => messageIndexes.some(index => entry.segment?.messageIndexes?.includes(index)))
    .map((entry: any) => entry.grade)
    .filter(Boolean);
  const bestGrade = segmentGrades.length
    ? segmentGrades.reduce((best: any, current: any) => (current.overallScore || 0) > (best.overallScore || 0) ? current : best)
    : null;

  const category = String(dialogue.category || "").toLowerCase();
  const instructional = bestGrade?.dimensions?.instructional?.score || 0;
  const followup = bestGrade?.dimensions?.followupValue?.score || 0;
  const language = bestGrade?.dimensions?.languageVariation?.score || 0;
  const creative = bestGrade?.dimensions?.creativeCultural?.score || 0;

  if (instructional >= 70 || /task|instruction|informational/.test(category)) return "instructional";
  if (creative >= 60 || /creative|cultural|insight/.test(category)) return "creative";
  if (language >= 55 || /patois|dialect|language|code-switch/.test(category)) return "language";
  if (followup >= 60 || /context|follow/.test(category)) return "contextual";
  return "conversational";
}

function buildDialoguePayoutInputs(dialogues: any[], grades: any[], sourceIndexes?: number[]) {
  return dialogues.map((dialogue, index) => ({
    tier: payoutTierForDialogue(dialogue, sourceIndexes?.[index] ?? index, grades),
    units: 1,
  }));
}

function averageAcceptedRate(payout: any) {
  const acceptedUnits = (payout.breakdown || [])
    .filter((item: any) => item.tier !== "rejected")
    .reduce((sum: number, item: any) => sum + item.units, 0);
  if (!acceptedUnits) return 0;
  return Number((payout.total / acceptedUnits).toFixed(2));
}

function safeTrainingExportDataset(dataset: any) {
  const metadata = dataset.metadata || {};
  return {
    schemaVersion: "c2c-training-export-v1",
    datasetId: dataset.id,
    status: dataset.status,
    currency: dataset.currency,
    payoutAmount: dataset.payoutAmount,
    contentHash: dataset.contentHash || metadata.contentHash || "",
    hashVersion: dataset.hashVersion || metadata.hashVersion || "v1",
    purifiedFileName: dataset.purifiedFileName,
    dialogues: Array.isArray(dataset.dialogues)
      ? dataset.dialogues.map((dialogue: any, index: number) => ({
        id: dialogue.id || `dialogue-${index}`,
        prompt: dialogue.prompt,
        response: dialogue.response,
        isUseful: Boolean(dialogue.isUseful),
        score: Number(dialogue.score || 0),
        category: dialogue.category || "",
        explanation: dialogue.explanation || "",
      }))
      : [],
    metadata: {
      jsonVersion: metadata.jsonVersion,
      evaluatorVersion: metadata.evaluatorVersion,
      segmentationVersion: metadata.segmentationVersion,
      payoutVersion: metadata.payoutVersion,
      hashVersion: metadata.hashVersion,
      duplicateStatus: metadata.duplicateStatus || dataset.dupStatus,
      totalLinesAnalyzed: metadata.totalLinesAnalyzed,
      totalUsefulLines: metadata.totalUsefulLines,
      suitabilityScore: metadata.suitabilityScore,
      evaluationSummary: metadata.evaluationSummary,
      payoutRatePerUsefulLine: metadata.payoutRatePerUsefulLine,
      payout: metadata.payout,
      segments: metadata.segments,
      grades: metadata.grades,
      contextSignals: metadata.contextSignals,
    },
  };
}

function contributorSubmissionSummary(dataset: any) {
  const metadata = dataset.metadata || {};
  const txs = database.getTransactionsByDataset(dataset.id);
  const receipt = txs.find((tx: any) => tx.receiptNumber)?.receiptNumber || null;
  const latestTransaction = txs[0] || null;
  return {
    id: dataset.id,
    status: dataset.status,
    payoutAmount: Number(dataset.payoutAmount || 0),
    currency: dataset.currency || "JMD",
    submittedAt: dataset.timestamp || dataset.createdAt,
    purifiedFileName: dataset.purifiedFileName,
    contentHash: dataset.contentHash || metadata.contentHash || "",
    hashVersion: dataset.hashVersion || metadata.hashVersion || "v1",
    duplicateStatus: dataset.dupStatus || metadata.duplicateStatus || "clean",
    totalLinesAnalyzed: Number(metadata.totalLinesAnalyzed || 0),
    totalUsefulLines: Number(metadata.totalUsefulLines || 0),
    suitabilityScore: metadata.suitabilityScore ?? null,
    payoutVersion: metadata.payoutVersion || "",
    payoutRatePerUsefulLine: Number(metadata.payoutRatePerUsefulLine || 0),
    payoutBreakdown: metadata.payout?.breakdown || [],
    receiptNumber: receipt,
    transactionStatus: latestTransaction?.status || null,
    transactionId: latestTransaction?.id || null,
    proofAddedAt: latestTransaction?.proofAddedAt || null,
  };
}

// Main Endpoint: Anonymize WhatsApp Chats & Run AI evaluation for usefulness
app.post("/api/process-chat", requireSession, async (req: any, res) => {
  try {
    const { chatText, fileName, userId } = req.body;

    if (!chatText || !userId) {
      return res.status(400).json({ error: "Missing required fields: chatText and userId." });
    }

    if (userId !== req.session.user.id) {
      return res.status(403).json({ error: "Submission ownership does not match the signed-in account." });
    }

    const profile = database.getProfile(req.session.user.id);
    if (!profile) {
      return res.status(404).json({ error: "No user profile found. Please register first for proper record-keeping." });
    }
    
    // 1. Sanitize dialogue turns
    const rawAnonymizedTurns = sanitizeWhatsAppChatLocal(chatText);
    
    if (rawAnonymizedTurns.length === 0) {
      return res.status(400).json({
        error: "No chat messages could be parsed. Check that the file format is standard WhatsApp export syntax.",
      });
    }
    
    // Let's form alternating prompt/response training pairs
    // Typical prompt-response formation: A greeting followed by answer, conversational pairs
    const dialogues: any[] = [];
    for (let i = 0; i < rawAnonymizedTurns.length - 1; i += 2) {
      const turn1 = rawAnonymizedTurns[i];
      const turn2 = rawAnonymizedTurns[i + 1];
      
      // Simple heuristic for dialogue pairing
      dialogues.push({
        prompt: `[${turn1.speaker}]: ${turn1.text}`,
        response: `[${turn2.speaker}]: ${turn2.text}`,
        isUseful: false, // will be evaluated
        score: 50,
        category: "Informational",
      });
    }
    
    // For original dialogue preview side-by-side
    const originalLinesPreview = rawAnonymizedTurns.map((turn, index) => ({
      id: `turn-${index}`,
      speaker: turn.speaker,
      originalText: turn.originalLine,
      cleanedText: `[${turn.speaker}]: ${turn.text}`,
      isUseful: turn.text.split(/\s+/).length > 3, // Initial local heuristic
    }));
    
    // Calculate size stats
    const totalLinesAnalyzed = rawAnonymizedTurns.length;
    
    // 2. Perform Hybrid local-first evaluation to optimize AI cost and maintain accuracy
    let evaluationSummary = "Analyzed conversation using Hybrid Static Pre-filtering.";
    let suitabilityScore = 70;
    
    // Local rules pre-classification mapping
    const localEvaluations: Record<number, { isUseful: boolean; score: number; category: string; explanation: string }> = {};
    const ambiguousIndices: number[] = [];
    
    dialogues.forEach((d, idx) => {
      const localResult = evaluateDialogueLocally(d);
      if (localResult) {
        localEvaluations[idx] = localResult;
      } else {
        ambiguousIndices.push(idx);
      }
    });

    let aiscoredIndicators: Record<number, { isUseful: boolean; score: number; category: string; explanation: string }> = {};
    const localOptimizedCount = Object.keys(localEvaluations).length;
    
    if (ambiguousIndices.length > 0 && AI_PROVIDER !== "local") {
      try {
        const samplingCount = Math.min(ambiguousIndices.length, 15);
        const ambiguousSample = ambiguousIndices.slice(0, samplingCount).map((idx) => ({
          idx,
          prompt: dialogues[idx].prompt.slice(0, 1200),
          response: dialogues[idx].response.slice(0, 1200),
        }));

        const aiPrompt = `You are an AI Trainer Audit Model evaluating conversational dataset quality for fine-tuning a LLM chatbot.
Analyze these AMBIGUOUS dialogue pairs and produce a JSON report scoring their instructional utility.

Special Filtering Rules:
1. System Messages / Autogenerated texts: NOT useful (isUseful = false, category = "Noise").
2. Generic or Untranslatable Patois Dialect: Reject heavy Patois that cannot be translated to Standard English (isUseful = false, category = "Untranslatable Patois"). Light recognizable Patois is acceptable.
3. Very short greetings, laughing/giggle chats (lol, lmao), empty words, useless chit-chat: NOT useful (isUseful = false, category = "Greetings" or "Noise").
4. Clear questions, constructive answers, task problems, contextual chats: highly useful (isUseful = true, category = "Informational" or "Task-oriented").

Ambiguous Dialogs Sample:
${JSON.stringify(ambiguousSample, null, 2)}

Respond strictly in valid JSON:
{"suitabilityScore": number, "evaluationSummary": "string", "scoredIndices": [{"idx": number, "isUseful": boolean, "score": number, "category": "string", "explanation": "string"}]}`;

        const boundedPrompt = aiPrompt.slice(0, MAX_AI_PROMPT_CHARS);
        const result = await runAIEvaluation(boundedPrompt);

        if (result) {
          suitabilityScore = result.suitabilityScore ?? 75;
          const providerLabel = AI_PROVIDER === "oreluwa" ? "Oreluwa (RunPod)" : "DeepSeek";
          evaluationSummary = `Hybrid engine active: pre-filtered ${localOptimizedCount} turns locally, audited ${ambiguousSample.length} ambiguous items via ${providerLabel}.`;

          if (Array.isArray(result.scoredIndices)) {
            result.scoredIndices.forEach((item: any) => {
              aiscoredIndicators[item.idx] = {
                isUseful: !!item.isUseful,
                score: item.score ?? (item.isUseful ? 85 : 20),
                category: item.category || "Informational",
                explanation: item.explanation || "",
              };
            });
          }
        }
      } catch (aiError) {
        console.error("AI evaluation failed, using static fallback", aiError);
        evaluationSummary = `Hybrid static fail-safe: optimized ${localOptimizedCount} dialogue turns locally. Fallback heuristics applied.`;
      }
    } else {
      evaluationSummary = `Static pre-filtering evaluated ${localOptimizedCount} dialogue turns locally. No AI evaluation needed — optimal token consumption.`;
    }
    
    // Apply statistical or AI-grounded labels down to the full dialogue list
    dialogues.forEach((d, idx) => {
      const aiEval = aiscoredIndicators[idx];
      const localEval = localEvaluations[idx];
      if (aiEval) {
        d.isUseful = aiEval.isUseful;
        d.category = aiEval.category;
        d.score = aiEval.score ?? Math.round(aiEval.isUseful ? 80 + Math.random() * 20 : Math.random() * 40);
        d.explanation = aiEval.explanation;
      } else if (localEval) {
        d.isUseful = localEval.isUseful;
        d.category = localEval.category;
        d.score = localEval.score;
        d.explanation = localEval.explanation;
      } else {
        // Statistical heuristic fallback for remaining lines (e.g. if can't match or AI failed)
        const wordsInPrompt = d.prompt.split(/\s+/).length;
        const wordsInResponse = d.response.split(/\s+/).length;
        const isStandardNoise = d.prompt.toLowerCase().includes("lol") || 
                              d.response.toLowerCase().includes("lol") ||
                              wordsInPrompt <= 2 || wordsInResponse <= 2;
                              
        d.isUseful = !isStandardNoise && (wordsInPrompt + wordsInResponse > 8);
        d.score = d.isUseful ? 75 : 20;
        d.category = isStandardNoise ? "Noise" : "Informational";
        d.explanation = d.isUseful ? "Meets length and lexical diversity check." : "Too brief or high informal noise.";
      }
    });
    
    const uniqueTokens = Math.round(totalLinesAnalyzed * 4.8);
    const estimatedTokens = Math.round(totalLinesAnalyzed * 15.2);
    const canonicalDialogues = dialogues.map((d: any) => ({ prompt: d.prompt || "", response: d.response || "" }));
    const contentHash = hashCanonicalDialogues(canonicalDialogues);
    const pairHashes = canonicalDialogues.map((dialogue: any) =>
      hashPair("canonical-pair", `${dialogue.prompt}\n${dialogue.response}`),
    );
    const previewExistingDataset = database.getDatasetByContentHash(contentHash);
    const previewExistingPairHashes = database.getExistingPairHashes(pairHashes);
    const duplicatePreview = previewExistingDataset
      ? {
        status: previewExistingDataset.userId === req.session.user.id ? "already_submitted_by_you" : "exact_duplicate",
        matchedPairs: pairHashes.length,
        totalPairs: pairHashes.length,
        wouldStrikeOnSubmit: previewExistingDataset.userId !== req.session.user.id,
        message: previewExistingDataset.userId === req.session.user.id
          ? "This chat was already submitted by your account. Submitting again will restore the existing receipt instead of creating a new payout."
          : "This chat was already submitted by another account. Submitting it would add a duplicate strike.",
      }
      : previewExistingPairHashes.length > 0
        ? {
          status: previewExistingPairHashes.length === pairHashes.length ? "all_pairs_duplicate" : "partial_duplicate",
          matchedPairs: previewExistingPairHashes.length,
          totalPairs: pairHashes.length,
          wouldStrikeOnSubmit: previewExistingPairHashes.length === pairHashes.length,
          message: previewExistingPairHashes.length === pairHashes.length
            ? "All dialogue pairs in this chat were already received. Submitting it would add a duplicate strike."
            : `${previewExistingPairHashes.length} of ${pairHashes.length} dialogue pairs were already received. Submitting will keep only new dialogue pairs.`,
        }
        : {
          status: "clean",
          matchedPairs: 0,
          totalPairs: pairHashes.length,
          wouldStrikeOnSubmit: false,
          message: "No duplicate dialogue pairs detected in preview.",
        };
    const normalizedMessages = rawAnonymizedTurns.map((turn, index) => ({
      index,
      speaker: turn.speaker,
      text: turn.text,
      gapBucket: "short" as const,
    }));
    const segments = segmentConversation(normalizedMessages);
    const grades = segments.map(segment => ({ segment, grade: gradeSegment(normalizedMessages, segment) }));
    const contextSignals = detectContextSignals(normalizedMessages);
    applyContextAwareDialogueLabels(dialogues, grades);
    const totalUsefulLines = dialogues.filter((d: any) => d.isUseful).length;

    // Mirror updates back to raw lines preview so they match visually in UI
    originalLinesPreview.forEach((line, idx) => {
      // Find matching dialogue turn
      const dialogueIdx = Math.floor(idx / 2);
      if (dialogues[dialogueIdx]) {
        line.isUseful = dialogues[dialogueIdx].isUseful;
      }
    });

    const tierInputs = buildDialoguePayoutInputs(dialogues, grades);
    const payout = calculateTieredPayout(tierInputs, (profile as any).demographicOptIn ? 2 : 1);
    // MindWave buyer payout: JMD $10-$75 per accepted dialogue pair by value tier.
    const payoutAmount = payout.total;
    const ratePerPair = averageAcceptedRate(payout);
    const currency = profile.country === "JM" ? "JMD" : profile.country === "BB" ? "BBD" : "TTD";
    
    const datasetId = `DS-${Date.now()}`;
    const timestampStr = new Date().toISOString();
    
    // Construct strict compliance purified file name including User ID for proper reconciliation
    const extension = "json";
    const cleanOrigName = (fileName || "chat.txt")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .slice(0, 15);
    const purifiedFileName = `whatsapp_dataset_${userId}_${Date.now()}.${extension}`;
    
    const dataset: any = {
      id: datasetId,
      userId,
      userEmail: profile.email,
      userPhone: profile.phone,
      originalFileName: fileName || "whatsapp_chat.zip",
      purifiedFileName,
      timestamp: timestampStr,
      status: "Pending Review", // Requires 7-14 days verification as requested
      payoutAmount,
      currency,
      contentHash,
      hashVersion: "v1",
      metadata: {
        jsonVersion: "c2c-json-v1",
        evaluatorVersion: EVALUATOR_VERSION,
        segmentationVersion: SEGMENTATION_VERSION,
        payoutVersion: PAYOUT_VERSION,
        contentHash,
        hashVersion: "v1",
        anonymizationRules: [
          "Removed WhatsApp timestamp and dates",
          "Anonymized participant contact names and numbers using Speaker tags",
          "Redacted physical phone numbers and explicit email sequences automatically"
        ],
        evaluationSummary,
        suitabilityScore,
        payoutRatePerUsefulLine: ratePerPair,
        totalLinesAnalyzed,
        totalUsefulLines,
        duplicatePreview,
        uniqueUserTokens: uniqueTokens,
        estimatedTokens,
        segments,
        grades,
        contextSignals,
        payout,
      },
      dialogues,
      originalLinesPreview: originalLinesPreview.slice(0, 300), // Cap preview list for rendering speed
    };

    // Draft mode is intentionally non-persistent: no dataset, payout, strike, or receipt is created.
    if (req.body.draftOnly === true) {
      return res.json({
        success: true,
        draft: true,
        dataset: {
          ...dataset,
          status: "Draft",
          userEmail: "",
          userPhone: "",
          payoutAmount,
      metadata: {
            ...dataset.metadata,
            payoutPendingContextReview: true,
          },
          originalLinesPreview: originalLinesPreview.slice(0, 300),
        },
      });
    }

    // ── Duplicate detection ──────────────────────────────────────────────────
    // Block flagged accounts
    if (database.isAccountFlagged(userId)) {
      return res.status(403).json({ error: "account_flagged", message: "Your account has been flagged for suspicious activity. Contact support." });
    }

    // Full content duplicate → strike
    if (database.contentHashExists(contentHash)) {
      const existingDataset = database.getDatasetByContentHash(contentHash);
      if (existingDataset?.userId === req.session.user.id) {
        return res.json({
          success: true,
          idempotent: true,
          dataset: existingDataset,
          message: "This anonymized dataset was already submitted. Returning the existing record.",
        });
      }
      const { strikes, flagged } = database.addStrike(userId);
      database.addAuditLog("duplicate_detected", null, userId, `Full duplicate — strike ${strikes}/4${flagged ? " — ACCOUNT FLAGGED" : ""}`);
      return res.status(409).json({
        error: "duplicate",
        message: "This chat export has already been submitted. Please submit a different conversation.",
        strikes,
        accountFlagged: flagged,
      });
    }

    // Per-pair cross-user duplicate check
    const existingHashes = database.getExistingPairHashes(pairHashes);
    let dupStatus = "clean";
    let filteredDialogues = dialogues;
    let filteredPairHashes = pairHashes;

    if (existingHashes.length === pairHashes.length && pairHashes.length > 0) {
      // All pairs are duplicates → strike
      const { strikes, flagged } = database.addStrike(userId);
      database.addAuditLog("duplicate_detected", null, userId, `All pairs duplicate — strike ${strikes}/4${flagged ? " — ACCOUNT FLAGGED" : ""}`);
      return res.status(409).json({
        error: "duplicate",
        message: "This chat export has already been submitted. Please submit a different conversation.",
        strikes,
        accountFlagged: flagged,
      });
    }

    if (existingHashes.length > 0) {
      // Partial duplicate — keep only new pairs, adjust payout
      dupStatus = "partial";
      const existingSet = new Set(existingHashes);
      const newIndices: number[] = [];
      pairHashes.forEach((h, i) => { if (!existingSet.has(h)) newIndices.push(i); });
      filteredDialogues = newIndices.map((i: number) => dialogues[i]);
      filteredPairHashes = newIndices.map((i: number) => pairHashes[i]);

      const newUsefulLines = filteredDialogues.filter((d: any) => d.isUseful).length;
      const filteredPayoutInputs = buildDialoguePayoutInputs(filteredDialogues, grades, newIndices);
      const filteredPayout = calculateTieredPayout(filteredPayoutInputs, (profile as any).demographicOptIn ? 2 : 1);
      dataset.payoutAmount = filteredPayout.total;
      dataset.dialogues = filteredDialogues;
      dataset.metadata = {
        ...dataset.metadata,
        payout: filteredPayout,
        payoutRatePerUsefulLine: averageAcceptedRate(filteredPayout),
        totalUsefulLines: newUsefulLines,
        partialDuplicate: true,
        newPairsOnly: newIndices.length,
      };
    }

    dataset.contentHash = contentHash;
    // ── End duplicate detection ──────────────────────────────────────────────

    dataset.originalLinesPreview = [];
    database.createDataset(dataset);
    if (filteredPairHashes.length > 0) {
      database.insertPairHashes(filteredPairHashes, dataset.id, userId);
    }
    database.updateDatasetHash(dataset.id, contentHash, dupStatus);

    res.json({
      success: true,
      dataset,
      ...(dupStatus === "partial" ? { warning: "partial_duplicate", message: "Some turns in this chat have been submitted before. Your payout reflects only the new content." } : {}),
    });
  } catch (error: any) {
    console.error("Critical error in /api/process-chat:", error);
    res.status(500).json({ error: error.message || "Failed to process chat files." });
  }
});

// Contributor confirms the submitted dataset should stay in the payout review queue.
// This does not create a payout transaction; payout queueing and disbursement are admin-only.
app.post("/api/payout-requests", requireSession, (req: any, res) => {
  const { datasetId } = req.body;
  const userId = req.session.user.id;
  const dataset = database.getDataset(datasetId);
  if (!dataset || dataset.userId !== userId) {
    return res.status(404).json({ error: "Dataset not found." });
  }
  if (dataset.status !== "Pending Review") {
    return res.status(409).json({ error: "This dataset is not awaiting payout review." });
  }

  database.addAuditLog("payout_review_requested", userId, datasetId, JSON.stringify({
    status: dataset.status,
    payoutAmount: dataset.payoutAmount,
    currency: dataset.currency || "JMD",
  }));
  res.json({
    success: true,
    dataset,
    message: "Payout review request confirmed. A moderator must approve this dataset before admin can queue payment.",
  });
});

// Returns the contributor's WiPay payout link for admin to manually disburse
// No merchant API key needed — WiPay provides a payout link per contributor
app.post("/api/payouts", requireAdmin, (req, res) => {
  const { datasetId } = req.body;

  if (!datasetId) {
    return res.status(400).json({ error: "Missing datasetId." });
  }

  const dataset = database.getDataset(datasetId);
  if (!dataset) {
    return res.status(404).json({ error: "Dataset not found." });
  }

  if (dataset.status !== "Approved") {
    return res.status(409).json({ error: "Dataset must be approved before payout is queued." });
  }

  const userId = dataset.userId;
  const profile = database.getProfile(userId);
  if (!profile) {
    return res.status(404).json({ error: "User profile not found." });
  }

  const existing = database.getTransactionsByDataset(datasetId);
  if (existing.length) return res.json({ success: true, transaction: existing[0], idempotent: true });

  const txId = `WIPAY-TX-${Date.now()}`;
  const transaction: any = {
    id: txId,
    userId,
    datasetId,
    amount: dataset.payoutAmount,
    currency: dataset.currency || "JMD",
    gateway: "WiPay",
    status: "PENDING",
    timestamp: new Date().toISOString(),
    referenceHash: txId,
  };

  database.createTransaction(transaction);
  database.updateDataset(datasetId, { status: "Approved" });

  res.json({
    success: true,
    message: "Payout queued. Use the WiPay link below to disburse funds to the contributor.",
    wipayLink: (profile as any).wipayLink || null,
    transaction,
  });
});

app.post("/api/admin/payout-approve", requireAdmin, (req: any, res) => {
  const { datasetId } = req.body;
  const dataset = database.getDataset(datasetId);
  if (!dataset) {
    return res.status(404).json({ error: "Dataset not found." });
  }

  const transactions = database.getTransactionsByDataset(datasetId);
  if (!transactions.length) return res.status(409).json({ error: "Payout must be queued before disbursement." });
  if (dataset.status === "Disbursed" || transactions[0].status === "DISBURSED") {
    return res.json({ success: true, idempotent: true, dataset });
  }

  database.updateTransactionStatus(transactions[0].id, "DISBURSED");
  database.updateDataset(datasetId, { status: "Disbursed" });
  database.addAuditLog("payout_disbursed", req.session?.user?.id || null, datasetId);

  res.json({
    success: true,
    dataset: database.getDataset(datasetId),
  });
});

// ── User: Get receipt for their own dataset ───────────────────────────────
app.get("/api/my-receipt/:datasetId", requireSession, (req: any, res) => {
  const userId = req.session.user.id;
  const { datasetId } = req.params;

  const dataset = database.getDataset(datasetId);
  if (!dataset || dataset.userId !== userId) {
    return res.status(404).json({ error: "Not found." });
  }

  const txs = database.getTransactionsByDataset(datasetId);
  const receipt = txs.find((t: any) => t.receiptNumber)?.receiptNumber || null;
  return res.json({ receiptNumber: receipt, status: dataset.status });
});

// ── User: List owned submissions and receipt state ─────────────────────────
app.get("/api/my-submissions", requireSession, (req: any, res) => {
  const userId = req.session.user.id;
  const datasets = database.getDatasetsByUser(userId).map(contributorSubmissionSummary);
  return res.json({ submissions: datasets });
});

// ── Admin: Picture-password verify ────────────────────────────────────────
app.post("/api/admin/picture-verify", (req, res) => {
  if (IS_PRODUCTION) {
    return res.status(404).json({ error: "Legacy admin auth is disabled." });
  }

  const ip = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "unknown").split(",")[0].trim();
  const now = Date.now();

  // Rate limit: 3 attempts per 15 minutes per IP
  const attempt = adminAttempts.get(ip);
  if (attempt) {
    if (attempt.resetAt > now && attempt.count >= 3) {
      return res.status(429).json({ error: "Too many attempts." });
    }
    if (attempt.resetAt <= now) {
      adminAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    } else {
      attempt.count++;
    }
  } else {
    adminAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
  }

  const { sequence } = req.body;
  if (!Array.isArray(sequence) || sequence.length !== ADMIN_CLICK_SEQUENCE.length) {
    return res.status(401).json({ error: "Invalid." });
  }

  const match = sequence.every((z: string, i: number) => z === ADMIN_CLICK_SEQUENCE[i]);
  if (!match) {
    return res.status(401).json({ error: "Invalid." });
  }

  // Generate single-use temp token, 60s TTL
  const token = crypto.randomBytes(32).toString("hex");
  adminTempTokens.set(token, now + 60 * 1000);
  return res.json({ token });
});

// ── Admin: Passphrase verify + session creation ────────────────────────────
app.post("/api/admin/auth", async (req, res) => {
  if (IS_PRODUCTION) {
    return res.status(404).json({ error: "Legacy admin auth is disabled." });
  }

  const { tempToken, passphrase } = req.body;
  const now = Date.now();

  const expires = adminTempTokens.get(tempToken);
  if (!expires || expires < now) {
    adminTempTokens.delete(tempToken);
    return res.status(401).json({ error: "Token expired or invalid." });
  }

  if (!ADMIN_PASSPHRASE || passphrase !== ADMIN_PASSPHRASE) {
    adminTempTokens.delete(tempToken);
    return res.status(401).json({ error: "Invalid passphrase." });
  }

  adminTempTokens.delete(tempToken); // single-use

  // Check for existing admin user, create if none
  let adminUserId: string;
  const adminEmail = process.env.ADMIN_EMAIL || "admin@chat2cash.internal";

  try {
    // Try to sign in as admin
    const signInRes = await auth.api.signInEmail({
      body: { email: adminEmail, password: ADMIN_PASSPHRASE, callbackURL: "/admin-dashboard" },
      headers: req.headers as any,
      asResponse: true,
    });

    // Forward Set-Cookie from Better Auth to the client
    const setCookie = signInRes.headers.get("set-cookie");
    if (setCookie) res.setHeader("Set-Cookie", setCookie);

    return res.json({ success: true });
  } catch {
    // Admin user doesn't exist — create it
    try {
      await auth.api.signUpEmail({
        body: {
          email: adminEmail,
          password: ADMIN_PASSPHRASE,
          name: "Admin",
          callbackURL: "/admin-dashboard",
        },
        headers: req.headers as any,
      });

      // Update role to admin via DB directly
      const userRow = (database as any).db?.prepare("SELECT id FROM user WHERE email = ?").get(adminEmail) as any;
      if (userRow) {
        (database as any).db?.prepare("UPDATE user SET role = 'admin' WHERE id = ?").run(userRow.id);
      }

      // Sign in now
      const signInRes2 = await auth.api.signInEmail({
        body: { email: adminEmail, password: ADMIN_PASSPHRASE, callbackURL: "/admin-dashboard" },
        headers: req.headers as any,
        asResponse: true,
      });
      const setCookie2 = signInRes2.headers.get("set-cookie");
      if (setCookie2) res.setHeader("Set-Cookie", setCookie2);

      return res.json({ success: true });
    } catch (err: any) {
      console.error("[admin/auth] Failed:", err);
      return res.status(500).json({ error: "Admin auth failed." });
    }
  }
});

// ── Admin: Dataset list ────────────────────────────────────────────────────
app.get("/api/admin/datasets", requireAdmin, (_req, res) => {
  res.json(database.getAllDatasetsAdmin());
});

app.get("/api/admin/staff", requireRole("admin", "owner"), (_req, res) => {
  res.json(listStaffUsers());
});

app.post("/api/admin/staff/invite", requireRole("admin", "owner"), (req: any, res) => {
  const { email, role } = req.body;
  if (!email || !role) return res.status(400).json({ error: "email and role are required." });
  try {
    const invite = createStaffInvite(email, role, req.session.user.id);
    database.addAuditLog("staff_invited", req.session.user.id, invite.email, JSON.stringify({ role: invite.role }));
    res.status(201).json({ success: true, invite });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Staff invite failed." });
  }
});

app.post("/api/staff/invite/accept", async (req, res) => {
  const { token, name, password } = req.body;
  if (!token || !name?.trim() || !password) return res.status(400).json({ error: "token, name, and password are required." });
  try {
    const invite = consumeStaffInvite(token);
    const signUp = await auth.api.signUpEmail({
      body: { email: invite.email, name: name.trim(), password },
      headers: req.headers as any,
      asResponse: true,
    });
    if (!signUp.ok) return res.status(signUp.status).json({ error: "Staff account creation failed." });
    const user = (await signUp.json()) as any;
    const userId = user?.user?.id;
    if (userId) updateStaffRole(userId, invite.role);
    const cookie = signUp.headers.get("set-cookie");
    if (cookie) res.setHeader("Set-Cookie", cookie);
    res.status(201).json({ success: true, role: invite.role });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Invite acceptance failed." });
  }
});

app.post("/api/admin/staff/role", requireRole("owner"), (req: any, res) => {
  try {
    updateStaffRole(req.body.userId, req.body.role);
    database.addAuditLog("staff_role_changed", req.session.user.id, req.body.userId, JSON.stringify({ role: req.body.role }));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Role update failed." });
  }
});

app.post("/api/admin/staff/disable", requireRole("admin", "owner"), (req: any, res) => {
  try {
    setStaffDisabled(req.body.userId, Boolean(req.body.disabled));
    database.addAuditLog("staff_status_changed", req.session.user.id, req.body.userId, JSON.stringify({ disabled: Boolean(req.body.disabled) }));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Staff status update failed." });
  }
});

app.post("/api/admin/staff/revoke-sessions", requireRole("admin", "owner"), (req: any, res) => {
  try {
    const count = revokeUserSessions(req.body.userId);
    database.addAuditLog("staff_sessions_revoked", req.session.user.id, req.body.userId, JSON.stringify({ count }));
    res.json({ success: true, revoked: count });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Session revocation failed." });
  }
});

// Moderator queue — content is already sanitized before it reaches this route.
app.get("/api/moderation/queue", requireRole("moderator", "admin", "owner"), (_req, res) => {
  const datasets = database.getAllDatasetsAdmin()
    .filter((dataset: any) => ["Pending Review", "Held", "Correction Requested"].includes(dataset.status))
    .map((dataset: any) => ({
      ...dataset,
      email: undefined,
      userPhone: undefined,
      wipayLink: undefined,
    }));
  res.json(datasets);
});

// Moderator/admin review decision with an auditable reason.
app.post("/api/moderation/decision", requireRole("moderator", "admin", "owner"), (req: any, res) => {
  const { datasetId, decision, reason } = req.body;
  const allowed = ["approve", "reject", "hold", "correction"];
  if (!datasetId || !allowed.includes(decision)) {
    return res.status(400).json({ error: "datasetId and a valid moderation decision are required." });
  }
  const dataset = database.getDataset(datasetId);
  if (!dataset) return res.status(404).json({ error: "Dataset not found." });
  const before = { status: dataset.status, payoutAmount: dataset.payoutAmount, metadata: dataset.metadata };
  const status = decision === "approve"
    ? "Approved"
    : decision === "reject"
      ? "Declined"
      : decision === "correction"
        ? "Correction Requested"
        : "Held";
  database.updateDataset(datasetId, { status });
  const updated = database.getDataset(datasetId);
  database.addAuditLog("moderation_decision", req.session.user.id, datasetId, JSON.stringify({
    decision,
    reason: reason || "",
    before,
    after: { status: updated?.status, payoutAmount: updated?.payoutAmount, metadata: updated?.metadata },
  }));
  res.json({ success: true, dataset: updated });
});

// ── Admin: Dataset export ──────────────────────────────────────────────────
app.get("/api/admin/datasets/:id/export", requireAdmin, (req, res) => {
  const dataset = database.getDataset(req.params.id);
  if (!dataset) return res.status(404).json({ error: "Not found." });
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.id}.json"`);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(safeTrainingExportDataset(dataset), null, 2));
});

// ── Admin: Export all approved/disbursed as JSONL ─────────────────────────
app.get("/api/admin/export-all", requireAdmin, (_req, res) => {
  const datasets = database.getAllDatasetsAdmin()
    .filter((d: any) => ["Approved", "Disbursed"].includes(d.status));
  const lines = datasets.map((d: any) => JSON.stringify(safeTrainingExportDataset(d)));
  res.setHeader("Content-Disposition", "attachment; filename=\"chat2cash-export.jsonl\"");
  res.setHeader("Content-Type", "application/x-ndjson");
  res.send(lines.join("\n"));
});

// ── Admin: Add proof of payment ────────────────────────────────────────────
app.post("/api/admin/payout-proof", requireAdmin, async (req: any, res) => {
  const { datasetId, receiptNumber } = req.body;
  if (!datasetId || !receiptNumber) return res.status(400).json({ error: "Missing fields." });

  const txs = database.getTransactionsByDataset(datasetId);
  if (!txs.length) return res.status(404).json({ error: "No transaction found for this dataset." });

  database.addPayoutProof(txs[0].id, receiptNumber);
  database.addAuditLog("proof_added", req.session?.user?.id || null, datasetId, `Receipt: ${receiptNumber}`);
  res.json({ success: true });
});

// ── Admin: Flagged submissions ─────────────────────────────────────────────
app.get("/api/admin/flagged", requireAdmin, (_req, res) => {
  res.json(database.getFlaggedDatasets());
});

// ── Admin: Override flag ───────────────────────────────────────────────────
app.post("/api/admin/flag-override", requireAdmin, async (req: any, res) => {
  const { datasetId } = req.body;
  if (!datasetId) return res.status(400).json({ error: "Missing datasetId." });
  database.clearFlag(datasetId);
  database.addAuditLog("flag_override", req.session?.user?.id || null, datasetId);
  res.json({ success: true });
});

// ── Admin: Audit log ──────────────────────────────────────────────────────
app.get("/api/admin/audit", requireAdmin, (_req, res) => {
  res.json(database.getAuditLog());
});

// ── Admin: Flagged accounts ────────────────────────────────────────────────
app.get("/api/admin/flagged-accounts", requireAdmin, (_req, res) => {
  res.json(database.getFlaggedAccounts());
});

// ── Admin: Clear strikes on an account ────────────────────────────────────
app.post("/api/admin/clear-strikes", requireAdmin, async (req: any, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId." });
  database.clearStrikes(userId);
  database.addAuditLog("strikes_cleared", req.session?.user?.id || null, userId);
  res.json({ success: true });
});

// ── Admin: Manually add a strike to an account ────────────────────────────
app.post("/api/admin/add-strike", requireAdmin, async (req: any, res) => {
  const { userId, reason } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId." });
  const { strikes, flagged } = database.addStrike(userId);
  database.addAuditLog("strike_added_by_admin", req.session?.user?.id || null, userId, reason || `Manual strike — ${strikes}/4${flagged ? " — ACCOUNT FLAGGED" : ""}`);
  res.json({ success: true, strikes, accountFlagged: flagged });
});

// Serve frontend build static files in production
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  // Vite Dev middleware so that HMR-less Vite development works inside Express container
  (async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  })();
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Express server running on http://0.0.0.0:${PORT}`);
});
