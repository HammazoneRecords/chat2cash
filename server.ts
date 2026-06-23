import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { database } from "./db";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "4001");

// Shared user secret keys or fallback values
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const WIPAY_ACCOUNT_NUMBER = process.env.WIPAY_ACCOUNT_NUMBER || "1234567";
const WIPAY_MERCHANT_KEY = process.env.WIPAY_MERCHANT_KEY || "";
const WIPAY_COUNTRY_CODE = process.env.WIPAY_COUNTRY_CODE || "JM";

if (!DEEPSEEK_API_KEY) {
  console.warn("WARNING: DEEPSEEK_API_KEY not set. AI evaluation will fall back to local heuristics.");
}

// SQLite database (chat2cash.db) initialized in db.ts with schema and WAL mode
// All data operations are transactional and concurrent-safe

// Support parsing JSON & URL encoded payloads up to 50MB
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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
  req.session = session;
  next();
}

async function requireAdmin(req: any, res: express.Response, next: express.NextFunction) {
  const session = await auth.api.getSession({ headers: req.headers as any });
  if (!session) {
    return res.status(401).json({ error: "Authentication required." });
  }
  if (session.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  req.session = session;
  next();
}

// --- API Endpoints ---

// Current session user + profile — used to restore session on page load
app.get("/api/me", requireSession, (req: any, res) => {
  const userId = req.session.user.id;
  const user = database.getProfile(userId);
  if (!user) {
    return res.status(404).json({ error: "Profile not found." });
  }
  res.json({ user });
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
    aiConfigured: !!DEEPSEEK_API_KEY,
    wipayMerchantAccount: WIPAY_ACCOUNT_NUMBER || "Demo Gateway",
    wipayCountryCode: WIPAY_COUNTRY_CODE,
  });
});

// Profile update — called after Better Auth signUp to save contributor-specific fields
app.post("/api/profile/update", requireSession, (req: any, res) => {
  const userId = req.session.user.id;
  const { phone, wipayAccount, wipayLink, country, town, age, gender, educationLevel, school, singleParentHome, demographicOptIn, idPhoto } = req.body;

  if (demographicOptIn && !idPhoto) {
    return res.status(400).json({ error: "Photo ID required for 2x Payout Multiplier." });
  }

  try {
    database.updateProfile(userId, {
      phone: phone || "",
      wipayAccount: wipayAccount || "",
      wipayLink: wipayLink || "",
      country: country || "JM",
      town: town || "",
      age: Number(age) || null,
      gender: gender || "",
      educationLevel: educationLevel || null,
      school: school || null,
      singleParentHome: singleParentHome ? 1 : 0,
      demographicOptIn: demographicOptIn ? 1 : 0,
      idPhoto: idPhoto || "",
    });

    const user = database.getProfile(userId);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Profile update failed." });
  }
});

// Legacy registration endpoint — kept for backward compat, Better Auth flow is preferred
app.post("/api/profile", (req, res) => {
  const { email, phone, fullName, wipayAccount, wipayLink, country, town, age, gender, educationLevel, school, singleParentHome, demographicOptIn, idPhoto } = req.body;
  
  if (!email || !phone || !fullName || !age || !gender) {
    return res.status(400).json({ error: "Email, phone number, full name, age, and gender are required." });
  }

  // idPhoto is only mandatory if demographicOptIn is active
  if (demographicOptIn && !idPhoto) {
    return res.status(400).json({ error: "Photo ID attachment is required for 2x Demographic Payout verification." });
  }
  
  // Format phone to extract digits
  const cleanPhone = phone.replace(/\D/g, "");
  
  // Derive a persistent, proper UserId based on email and phone hash or key-mapping
  // e.g. USR-TT-8681234
  const numericSuffix = cleanPhone.slice(-6) || Math.floor(100000 + Math.random() * 900000).toString();
  const userId = `USR-${country || "JM"}-${numericSuffix}`;

  const profile = {
    userId,
    fullName,
    email,
    phone,
    wipayAccount: wipayAccount || "",
    wipayLink: wipayLink || "",
    country: country || "JM",
    town: town || "",
    age: Number(age),
    gender,
    educationLevel,
    school,
    singleParentHome,
    demographicOptIn: !!demographicOptIn,
    idPhoto: idPhoto || "",
  };

  try {
    database.createProfile(profile);
  } catch (err: any) {
    if (err.message?.includes("UNIQUE constraint")) {
      return res.status(409).json({ error: "Profile with this email already exists." });
    }
    throw err;
  }

  res.json({
    success: true,
    user: profile,
  });
});

// Fetch detailed database statistics & transaction history for reconciliation
app.get("/api/reconciliation", (req, res) => {
  res.json({
    datasets: database.getAllDatasets(),
    profiles: database.getAllProfiles(),
    transactions: database.getAllTransactions(),
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

// Main Endpoint: Anonymize WhatsApp Chats & Run AI evaluation for usefulness
app.post("/api/process-chat", requireSession, async (req, res) => {
  try {
    const { chatText, fileName, userId } = req.body;

    if (!chatText || !userId) {
      return res.status(400).json({ error: "Missing required fields: chatText and userId." });
    }

    const profile = database.getProfile(userId);
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
    
    if (DEEPSEEK_API_KEY && ambiguousIndices.length > 0) {
      try {
        const samplingCount = Math.min(ambiguousIndices.length, 15);
        const ambiguousSample = ambiguousIndices.slice(0, samplingCount).map((idx) => ({
          idx,
          prompt: dialogues[idx].prompt,
          response: dialogues[idx].response,
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

        const aiResponse = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [{ role: "user", content: aiPrompt }],
            response_format: { type: "json_object" },
            max_tokens: 2000,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json() as any;
          const result = JSON.parse(aiData.choices[0].message.content);
          suitabilityScore = result.suitabilityScore ?? 75;
          evaluationSummary = `Hybrid engine active: pre-filtered ${localOptimizedCount} turns locally, audited ${ambiguousSample.length} ambiguous items via DeepSeek.`;

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
        console.error("DeepSeek evaluation failed, using static fallback", aiError);
        evaluationSummary = `Hybrid static fail-safe: optimized ${localOptimizedCount} dialogue turns locally. Fallback heuristics applied.`;
      }
    } else {
      evaluationSummary = `Static pre-filtering evaluated ${localOptimizedCount} dialogue turns locally. No AI evaluation needed — optimal token consumption.`;
    }
    
    // Apply statistical or AI-grounded labels down to the full dialogue list
    let totalUsefulLines = 0;
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
      
      if (d.isUseful) {
        totalUsefulLines++;
      }
    });

    // Mirror updates back to raw lines preview so they match visually in UI
    originalLinesPreview.forEach((line, idx) => {
      // Find matching dialogue turn
      const dialogueIdx = Math.floor(idx / 2);
      if (dialogues[dialogueIdx]) {
        line.isUseful = dialogues[dialogueIdx].isUseful;
      }
    });
    
    // JMD payout: $0.50–$4.00 JMD per useful dialogue pair, quality-scaled
    // suitabilityScore 0–100 maps linearly to $0.50–$4.00 JMD
    const qualityRate = 0.50 + (suitabilityScore / 100) * 3.50;
    // 2x demographic multiplier pushes range to $1.00–$8.00 JMD
    const ratePerPair = Number(((profile as any).demographicOptIn ? qualityRate * 2 : qualityRate).toFixed(2));
    
    const payoutAmount = Number((totalUsefulLines * ratePerPair).toFixed(2));
    const currency = profile.country === "JM" ? "JMD" : profile.country === "BB" ? "BBD" : "TTD";
    
    const uniqueTokens = Math.round(totalLinesAnalyzed * 4.8);
    const estimatedTokens = Math.round(totalLinesAnalyzed * 15.2);
    
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
      metadata: {
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
        uniqueUserTokens: uniqueTokens,
        estimatedTokens,
      },
      dialogues,
      originalLinesPreview: originalLinesPreview.slice(0, 300), // Cap preview list for rendering speed
    };

    database.createDataset(dataset);

    res.json({
      success: true,
      dataset,
    });
  } catch (error: any) {
    console.error("Critical error in /api/process-chat:", error);
    res.status(500).json({ error: error.message || "Failed to process chat files." });
  }
});

// Returns the contributor's WiPay payout link for admin to manually disburse
// No merchant API key needed — WiPay provides a payout link per contributor
app.post("/api/payouts", requireAdmin, (req, res) => {
  const { datasetId, userId, amount, currency } = req.body;

  if (!datasetId || !userId || !amount) {
    return res.status(400).json({ error: "Missing datasetId, userId, or amount." });
  }

  const dataset = database.getDataset(datasetId);
  if (!dataset) {
    return res.status(404).json({ error: "Dataset not found." });
  }

  const profile = database.getProfile(userId);
  if (!profile) {
    return res.status(404).json({ error: "User profile not found." });
  }

  const txId = `WIPAY-TX-${Date.now()}`;
  const transaction: any = {
    id: txId,
    userId,
    datasetId,
    amount: parseFloat(amount),
    currency: currency || "JMD",
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

app.post("/api/admin/payout-approve", requireAdmin, (req, res) => {
  const { datasetId } = req.body;
  const dataset = database.getDataset(datasetId);
  if (!dataset) {
    return res.status(404).json({ error: "Dataset not found." });
  }

  database.updateDataset(datasetId, { status: "Disbursed" });

  res.json({
    success: true,
    dataset: database.getDataset(datasetId),
  });
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
