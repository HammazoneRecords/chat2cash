import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const server = fs.readFileSync(path.join(root, "server.ts"), "utf8");
const landing = fs.readFileSync(path.join(root, "src", "components", "LandingHero.tsx"), "utf8");
const adminDashboard = fs.readFileSync(path.join(root, "src", "components", "AdminDashboard.tsx"), "utf8");
const adminLogin = fs.readFileSync(path.join(root, "src", "components", "AdminLogin.tsx"), "utf8");
const fileProcessor = fs.readFileSync(path.join(root, "src", "components", "FileProcessor.tsx"), "utf8");
const dockerignore = fs.readFileSync(path.join(root, ".dockerignore"), "utf8");

test("processing endpoint enforces session ownership", () => {
  assert.match(server, /app\.post\("\/api\/process-chat", requireSession/);
  assert.match(server, /Submission ownership does not match the signed-in account/);
});

test("draft preview keeps original raw line but persisted datasets strip preview lines", () => {
  assert.match(server, /originalLine: line/);
  assert.match(server, /originalText: turn\.originalLine/);
  assert.match(server, /originalLinesPreview: originalLinesPreview\.slice\(0, 300\)/);
  assert.match(server, /dataset\.originalLinesPreview = \[\]/);
});

test("legacy profile creation is disabled", () => {
  assert.match(server, /Legacy profile creation is disabled/);
});

test("public reconciliation returns aggregates and safe receipt rows only", () => {
  assert.match(server, /app\.get\("\/api\/reconciliation"/);
  assert.match(server, /publicReceipt: true/);
  assert.match(server, /dialogues: \[\]/);
  assert.match(server, /originalLinesPreview: \[\]/);
  assert.match(server, /anonymous-contributor/);
  assert.match(server, /profiles: \[\]/);
  assert.match(server, /transactions: \[\]/);
});

test("moderation queue is role protected", () => {
  assert.match(server, /app\.get\("\/api\/moderation\/queue", requireRole\("moderator", "admin", "owner"\)/);
  assert.match(server, /app\.post\("\/api\/moderation\/decision", requireRole\("moderator", "admin", "owner"\)/);
});

test("admin payout cannot trust client owner or amount and disbursement is idempotent", () => {
  assert.match(server, /const userId = dataset\.userId/);
  assert.match(server, /amount: dataset\.payoutAmount/);
  assert.match(server, /if \(existing\.length\) return res\.json\(\{ success: true, transaction: existing\[0\], idempotent: true \}\)/);
  assert.match(server, /if \(dataset\.status === "Disbursed" \|\| transactions\[0\]\.status === "DISBURSED"\)/);
});

test("contributor payout review request cannot create payout transaction or approval", () => {
  const requestSection = server.slice(
    server.indexOf('app.post("/api/payout-requests"'),
    server.indexOf("// Returns the contributor's WiPay payout link"),
  );
  const requestHandler = fileProcessor.slice(
    fileProcessor.indexOf("const handleInitiatePayout"),
    fileProcessor.indexOf("const filteredDialogues"),
  );
  assert.match(requestSection, /payout_review_requested/);
  assert.match(requestSection, /A moderator must approve this dataset before admin can queue payment/);
  assert.doesNotMatch(requestSection, /database\.createTransaction/);
  assert.doesNotMatch(requestHandler, /status: "Approved"/);
  assert.match(requestHandler, /Moderator approval is required before payment is queued/);
});

test("staff lifecycle routes enforce role boundaries and disabled sessions", () => {
  assert.match(server, /app\.get\("\/api\/admin\/staff", requireRole\("admin", "owner"\)/);
  assert.match(server, /app\.post\("\/api\/admin\/staff\/invite", requireRole\("admin", "owner"\)/);
  assert.match(server, /app\.post\("\/api\/admin\/staff\/role", requireRole\("owner"\)/);
  assert.match(server, /app\.post\("\/api\/admin\/staff\/disable", requireRole\("admin", "owner"\)/);
  assert.match(server, /app\.post\("\/api\/admin\/staff\/revoke-sessions", requireRole\("admin", "owner"\)/);
  assert.match(server, /app\.post\("\/api\/staff\/invite\/accept"/);
  assert.match(server, /if \(isUserDisabled\(session\.user\.id\)\) return res\.status\(403\)/);
});

test("voice waitlist uses the server and not browser-only persistence", () => {
  assert.match(landing, /fetch\("\/api\/waitlist"/);
  assert.doesNotMatch(landing, /localStorage\.setItem\(|localStorage\.getItem\(/);
});

test("AI evaluation is bounded and has deterministic fallback", () => {
  assert.match(server, /const MAX_AI_PROMPT_CHARS = 24000/);
  assert.match(server, /const boundedPrompt = aiPrompt\.slice\(0, MAX_AI_PROMPT_CHARS\)/);
  assert.match(server, /max_tokens: 2000/);
  assert.match(server, /Fallback heuristics applied/);
});

test("moderation decisions retain before and after state and expose evidence", () => {
  assert.match(server, /const before = \{ status: dataset\.status, payoutAmount: dataset\.payoutAmount, metadata: dataset\.metadata \}/);
  assert.match(server, /after: \{ status: updated\?\.status, payoutAmount: updated\?\.payoutAmount, metadata: updated\?\.metadata \}/);
  assert.match(adminDashboard, /Review Evidence/);
  assert.match(adminDashboard, /Context signals/);
  assert.match(adminDashboard, /Score evidence/);
  assert.match(adminDashboard, /Payout tiers/);
});

test("admin sign-in uses Better Auth and enforces an admin role check", () => {
  assert.match(adminLogin, /authClient\.signIn\.email/);
  assert.match(adminLogin, /fetch\("\/api\/admin\/staff"/);
  assert.match(adminLogin, /This account does not have admin access/);
});

test("legacy admin unlock is disabled in production", () => {
  const pictureSection = server.slice(
    server.indexOf('app.post("/api/admin/picture-verify"'),
    server.indexOf("// ── Admin: Passphrase verify"),
  );
  const passphraseSection = server.slice(
    server.indexOf('app.post("/api/admin/auth"'),
    server.indexOf("app.post(\"/api/staff/invite/accept\""),
  );
  assert.match(pictureSection, /if \(IS_PRODUCTION\)/);
  assert.match(passphraseSection, /if \(IS_PRODUCTION\)/);
  assert.match(adminLogin, /showLegacyAdminUnlock/);
  assert.match(adminLogin, /VITE_ENABLE_LEGACY_ADMIN_AUTH/);
});

test("request body limits are route-specific and security headers are present", () => {
  assert.doesNotMatch(server, /app\.use\(express\.json\(\{ limit: "50mb" \}\)\)/);
  assert.match(server, /function bodyLimitForPath/);
  assert.match(server, /"\/api\/process-chat", "\/api\/upload-json", "\/api\/submit-json-draft"/);
  assert.match(server, /if \(pathname === "\/api\/profile\/update"\) return "6mb"/);
  assert.match(server, /return "1mb"/);
  assert.match(server, /X-Content-Type-Options/);
  assert.match(server, /Content-Security-Policy/);
  assert.match(server, /Invalid request origin/);
});

test("docker context excludes secrets, databases, logs, and local artifacts", () => {
  assert.match(dockerignore, /^\.env$/m);
  assert.match(dockerignore, /^\*\.db$/m);
  assert.match(dockerignore, /^\*\.db-wal$/m);
  assert.match(dockerignore, /^node_modules$/m);
  assert.match(dockerignore, /^\.codex-check$/m);
  assert.match(dockerignore, /^\.codex-e2e$/m);
  assert.match(dockerignore, /^nul$/m);
});

test("admin dataset exports use the safe training export contract", () => {
  const exportHelper = server.slice(
    server.indexOf("function safeTrainingExportDataset"),
    server.indexOf("// Main Endpoint: Anonymize WhatsApp Chats"),
  );
  const singleExport = server.slice(
    server.indexOf('app.get("/api/admin/datasets/:id/export"'),
    server.indexOf("// ── Admin: Export all approved/disbursed"),
  );
  const bulkExport = server.slice(
    server.indexOf('app.get("/api/admin/export-all"'),
    server.indexOf("// ── Admin: Add proof of payment"),
  );

  assert.match(exportHelper, /schemaVersion: "c2c-training-export-v1"/);
  assert.match(exportHelper, /dialogues: Array\.isArray\(dataset\.dialogues\)/);
  assert.match(exportHelper, /contentHash/);
  assert.match(exportHelper, /contextSignals/);
  assert.match(singleExport, /safeTrainingExportDataset\(dataset\)/);
  assert.match(bulkExport, /safeTrainingExportDataset\(d\)/);
  assert.match(bulkExport, /\["Approved", "Disbursed"\]\.includes\(d\.status\)/);
  assert.doesNotMatch(singleExport, /JSON\.stringify\(dataset/);
  assert.doesNotMatch(bulkExport, /userId: d\.userId/);
  assert.doesNotMatch(exportHelper, /userEmail|userPhone|wipayLink|wipayAccount|fullName|email:|phone:|originalLinesPreview|originalLine|idPhoto/);
});

test("canonical JSON export excludes identity and includes review metadata", () => {
  const downloadSection = fileProcessor.slice(
    fileProcessor.indexOf("const handleDownloadJSON"),
    fileProcessor.indexOf("const handleSubmitReviewedDraft"),
  );
  assert.match(downloadSection, /schemaVersion: "c2c-json-v1"/);
  assert.match(downloadSection, /reviewMetadata/);
  assert.match(downloadSection, /evaluatorVersion/);
  assert.match(downloadSection, /segmentationVersion/);
  assert.match(downloadSection, /contextSignals/);
  assert.match(downloadSection, /payoutPreview/);
  assert.doesNotMatch(downloadSection, /userId: activeDataset\.userId/);
  assert.doesNotMatch(downloadSection, /contactEmail/);
  assert.doesNotMatch(downloadSection, /contactPhone/);
  assert.doesNotMatch(downloadSection, /timestamp: activeDataset\.timestamp/);
  assert.doesNotMatch(downloadSection, /qualityScore/);
  assert.doesNotMatch(downloadSection, /isInstructionalUseful/);
});

test("ZIP processing response includes context grading metadata", () => {
  const processChatSection = server.slice(
    server.indexOf('app.post("/api/process-chat"'),
    server.indexOf("// Contributor requests a payout"),
  );
  assert.match(processChatSection, /const normalizedMessages = rawAnonymizedTurns\.map/);
  assert.match(processChatSection, /const segments = segmentConversation\(normalizedMessages\)/);
  assert.match(processChatSection, /const grades = segments\.map\(segment => \(\{ segment, grade: gradeSegment\(normalizedMessages, segment\) \}\)\)/);
  assert.match(processChatSection, /const contextSignals = detectContextSignals\(normalizedMessages\)/);
  assert.match(processChatSection, /applyContextAwareDialogueLabels\(dialogues, grades\)/);
  assert.match(processChatSection, /const payout = calculateTieredPayout/);
  assert.match(processChatSection, /evaluatorVersion: EVALUATOR_VERSION/);
  assert.match(processChatSection, /segmentationVersion: SEGMENTATION_VERSION/);
  assert.match(processChatSection, /contentHash,\s*\n\s*hashVersion: "v1"/);
  assert.match(processChatSection, /segments,\s*\n\s*grades,\s*\n\s*contextSignals,\s*\n\s*payout/);
});

test("JSON duplicate submit path applies the same strike policy as ZIP", () => {
  const submitJsonSection = server.slice(
    server.indexOf('app.post("/api/submit-json-draft"'),
    server.indexOf("// Helper: Securely strip timestamps"),
  );
  assert.match(submitJsonSection, /if \(existing\?\.userId === userId\)/);
  assert.match(submitJsonSection, /success: true, idempotent: true/);
  assert.match(submitJsonSection, /Reviewed JSON full duplicate/);
  assert.match(submitJsonSection, /database\.addStrike\(userId\)/);
  assert.match(submitJsonSection, /Reviewed JSON all-pairs duplicate/);
  assert.match(submitJsonSection, /partial_duplicate/);
  assert.match(submitJsonSection, /payoutAmount/);
  assert.match(submitJsonSection, /payoutRatePerUsefulLine: ratePerPair/);
  assert.match(submitJsonSection, /applyContextAwareDialogueLabels\(gradedDialogues, grades\)/);
  assert.doesNotMatch(submitJsonSection, /category: "Pending Context Review"/);
});

test("reviewed draft submit surfaces duplicate and partial duplicate messages", () => {
  const submitHandler = fileProcessor.slice(
    fileProcessor.indexOf("const handleSubmitReviewedDraft"),
    fileProcessor.indexOf("// Secure export to CSV format"),
  );
  assert.match(submitHandler, /result\.error === "duplicate"/);
  assert.match(submitHandler, /Strike \$\{result\.strikes\}\/4/);
  assert.match(submitHandler, /partial_duplicate/);
  assert.match(submitHandler, /pricing applied/);
});

test("production bundle and staff invite route are present", () => {
  assert.ok(fs.existsSync(path.join(root, "dist", "server.cjs")));
  const main = fs.readFileSync(path.join(root, "src", "main.tsx"), "utf8");
  assert.match(main, /StaffInvite/);
});
