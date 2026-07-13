import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const server = fs.readFileSync(path.join(root, "server.ts"), "utf8");
const dbSource = fs.readFileSync(path.join(root, "db.ts"), "utf8");
const landing = fs.readFileSync(path.join(root, "src", "components", "LandingHero.tsx"), "utf8");
const helpFaq = fs.readFileSync(path.join(root, "src", "components", "HelpFaq.tsx"), "utf8");
const appShell = fs.readFileSync(path.join(root, "src", "App.tsx"), "utf8");
const adminDashboard = fs.readFileSync(path.join(root, "src", "components", "AdminDashboard.tsx"), "utf8");
const adminLogin = fs.readFileSync(path.join(root, "src", "components", "AdminLogin.tsx"), "utf8");
const loginForm = fs.readFileSync(path.join(root, "src", "components", "LoginForm.tsx"), "utf8");
const fileProcessor = fs.readFileSync(path.join(root, "src", "components", "FileProcessor.tsx"), "utf8");
const registrationForm = fs.readFileSync(path.join(root, "src", "components", "RegistrationForm.tsx"), "utf8");
const mySubmissions = fs.readFileSync(path.join(root, "src", "components", "MySubmissions.tsx"), "utf8");
const reconciliationLedger = fs.readFileSync(path.join(root, "src", "components", "ReconciliationLedger.tsx"), "utf8");
const dockerignore = fs.readFileSync(path.join(root, ".dockerignore"), "utf8");
const envExample = fs.readFileSync(path.join(root, ".env.example"), "utf8");
const backfillScript = fs.readFileSync(path.join(root, "scripts", "backfill-zero-pricing.cjs"), "utf8");

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
  const legacyProfileSection = server.slice(
    server.indexOf('app.post("/api/profile"'),
    server.indexOf("// Fetch detailed database statistics"),
  );
  assert.match(legacyProfileSection, /Legacy profile creation is disabled/);
  assert.doesNotMatch(legacyProfileSection, /database\.createProfile|cleanPhone|numericSuffix|idPhoto \|\|/);
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

test("overview stats align with public ledger payout semantics", () => {
  assert.match(dbSource, /totalPayoutsUnderReviewJMD/);
  assert.match(dbSource, /SELECT SUM\(payoutAmount\) as total FROM datasets WHERE currency = 'JMD'/);
  assert.match(landing, /totalPayoutsUnderReviewJMD/);
  assert.match(landing, /Payouts Under Review/);
  assert.doesNotMatch(landing, /Total Paid Out/);
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

test("admin payout proof follows queue then disburse then proof order", () => {
  const adminDatasetRoute = server.slice(
    server.indexOf('app.get("/api/admin/datasets"'),
    server.indexOf('app.get("/api/admin/staff"'),
  );
  const proofRoute = server.slice(
    server.indexOf('app.post("/api/admin/payout-proof"'),
    server.indexOf("// ── Admin: Flagged submissions"),
  );

  assert.match(adminDatasetRoute, /payoutTransaction/);
  assert.match(adminDatasetRoute, /receiptNumber/);
  assert.match(adminDatasetRoute, /proofAddedAt/);
  assert.match(proofRoute, /Payout must be marked disbursed before receipt proof can be added/);
  assert.match(proofRoute, /Admin reason is required for payout proof/);
  assert.match(proofRoute, /txs\[0\]\.status !== "DISBURSED"/);
  assert.match(adminDashboard, /payout-step-queue-/);
  assert.match(adminDashboard, /payout-step-disburse-/);
  assert.match(adminDashboard, /payout-step-proof-/);
  assert.match(adminDashboard, /payout-step-complete-/);
  assert.match(adminDashboard, /admin-reason-payout-/);
  assert.match(adminDashboard, /admin-reason-disburse-/);
  assert.match(adminDashboard, /admin-reason-proof-/);
  assert.match(adminDashboard, /Add Receipt Proof/);
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

test("contributors can return to owned submission receipts without raw content", () => {
  const mySubmissionsSection = server.slice(
    server.indexOf('app.get("/api/my-submissions"'),
    server.indexOf("// ── Admin: Picture-password verify"),
  );
  const summaryHelper = server.slice(
    server.indexOf("function contributorSubmissionSummary"),
    server.indexOf("// Main Endpoint: Anonymize WhatsApp Chats"),
  );

  assert.match(mySubmissionsSection, /requireSession/);
  assert.match(mySubmissionsSection, /database\.getDatasetsByUser\(userId\)/);
  assert.match(mySubmissionsSection, /contributorSubmissionSummary/);
  assert.match(summaryHelper, /receiptNumber/);
  assert.match(summaryHelper, /payoutBreakdown/);
  assert.doesNotMatch(summaryHelper, /dialogues|originalLinesPreview|originalLine|userEmail|userPhone|email:|phone:|wipayLink|wipayAccount|idPhoto/);
  assert.match(appShell, /nav-tab-submissions/);
  assert.match(appShell, /acct-\$\{userProfile\.userId\.slice\(-6\)\}/);
  assert.match(fileProcessor, /const publicAccountCode = user\.userId \? `acct-\$\{user\.userId\.slice\(-6\)\}`/);
  assert.doesNotMatch(fileProcessor, /Active Verification Key/);
  assert.match(mySubmissions, /fetch\("\/api\/my-submissions"/);
  assert.match(mySubmissions, /Raw chat lines and full anonymized dialogues are not returned here/);
});

test("contributor payout copy uses plain buyer-flow language", () => {
  assert.match(fileProcessor, /Estimated Payout/);
  assert.match(fileProcessor, /Average accepted rate/);
  assert.match(fileProcessor, /per accepted chat pair/);
  assert.match(fileProcessor, /Review Window/);
  assert.match(fileProcessor, /Review Score/);
  assert.match(fileProcessor, /Accepted for payout review/);
  assert.match(fileProcessor, /Low-value \/ needs context/);
  assert.match(reconciliationLedger, /Payout Status/);
  assert.match(reconciliationLedger, /Payout Record/);
  assert.match(reconciliationLedger, /accepted chat pairs/);
  assert.doesNotMatch(fileProcessor, /WIPAY ESTIMATE ESCROW|validated chatbot training pair|Legal Audit Locking|CLAIM DISBURSEMENT|Fine-Tuning Density Rating|Recommended Training Node|Noise Segment|Chit-Chat Noise/);
  assert.doesNotMatch(reconciliationLedger, /escrow holdings|Escrow released|Escrow Status|WiPay Ledger Log|fine-tuning segments/);
});

test("auth forms provide safe recovery guidance for common failures", () => {
  assert.match(loginForm, /function loginErrorMessage/);
  assert.match(loginForm, /Check the email and password/);
  assert.match(loginForm, /use Create one below/);
  assert.match(loginForm, /contributor profile could not load/);
  assert.match(registrationForm, /function registrationErrorMessage/);
  assert.match(registrationForm, /account may already exist for this email/);
  assert.match(registrationForm, /Use Sign in instead/);
  assert.match(registrationForm, /profile details need correction/);
  assert.doesNotMatch(loginForm, /setError\(err\?\.message \|\|/);
  assert.doesNotMatch(registrationForm, /setError\(err\?\.message \|\|/);
});

test("Patois and code-switching are not rejected for being dialect-heavy", () => {
  assert.match(server, /Patois, dialect, slang, code-switching, and spelling variation: score on meaning, context, and usefulness/);
  assert.match(server, /Do not reject a turn just because it is dialect-heavy/);
  assert.match(server, /category = "Needs More Context"/);
  assert.match(server, /Patois or slang detected, but the turn is too short to preserve meaning by itself/);
  assert.doesNotMatch(server, /Reject heavy Patois|Untranslatable Patois|Non-standard heavy Caribbean dialect pattern/);
});

test("staff lifecycle routes enforce role boundaries and disabled sessions", () => {
  assert.match(server, /app\.get\("\/api\/admin\/staff", requireRole\("admin", "owner"\)/);
  assert.match(server, /app\.post\("\/api\/admin\/staff\/invite", requireRole\("admin", "owner"\)/);
  assert.match(server, /app\.post\("\/api\/admin\/staff\/role", requireRole\("owner"\)/);
  assert.match(server, /app\.post\("\/api\/admin\/staff\/disable", requireRole\("admin", "owner"\)/);
  assert.match(server, /app\.post\("\/api\/admin\/staff\/revoke-sessions", requireRole\("admin", "owner"\)/);
  assert.match(server, /app\.post\("\/api\/staff\/invite\/accept"/);
  assert.match(server, /if \(isUserDisabled\(session\.user\.id\)\) return res\.status\(403\)/);
  assert.match(server, /Admin reason is required for staff status changes/);
  assert.match(server, /Admin reason is required for staff session revocation/);
  assert.match(adminDashboard, /admin-reason-staff-/);
  assert.match(adminDashboard, /disabled=\{reasonFor\(`staff:\$\{member\.id\}`\)\.length < 8\}/);
});

test("voice waitlist uses the server and not browser-only persistence", () => {
  assert.match(landing, /fetch\("\/api\/waitlist"/);
  assert.match(landing, /handleVoiceModalSubmit/);
  assert.match(landing, /Join audio waitlist/);
  assert.doesNotMatch(landing, /localStorage\.setItem\(|localStorage\.getItem\(/);
  assert.doesNotMatch(landing, /handleVoiceSubscribe|voiceEmail|setSubscribed/);
});

test("voice notes are clearly waitlist-only during text-chat launch", () => {
  assert.match(landing, /Future audio program/);
  assert.match(landing, /Future Audio Waitlist/);
  assert.match(landing, /not open for paid upload yet/);
  assert.match(landing, /Text-chat upload is the paid launch flow today/);
  assert.match(helpFaq, /Paid uploads are text-chat only at launch/);
  assert.match(helpFaq, /waitlist only notifies you/);
  assert.doesNotMatch(landing, /\$300|7,000|est\. \$1,200|est\. \$3,800|PREMIUM TIER/);
  assert.doesNotMatch(helpFaq, /coming soon!|highly demanded training data|get notified the second/);
});

test("AI evaluation is bounded and has deterministic fallback", () => {
  assert.match(server, /const MAX_AI_PROMPT_CHARS = 24000/);
  assert.match(server, /const boundedPrompt = aiPrompt\.slice\(0, MAX_AI_PROMPT_CHARS\)/);
  assert.match(server, /max_tokens: 2000/);
  assert.match(server, /Fallback heuristics applied/);
});

test("moderation decisions retain before and after state and expose evidence", () => {
  assert.match(server, /const before = \{ status: dataset\.status, payoutAmount: dataset\.payoutAmount, metadata: dataset\.metadata \}/);
  assert.match(server, /Moderation reason is required/);
  assert.match(server, /after: \{ status: updated\?\.status, payoutAmount: updated\?\.payoutAmount, metadata: updated\?\.metadata \}/);
  assert.match(adminDashboard, /admin-reason-moderation-/);
  assert.match(adminDashboard, /disabled=\{reasonFor\(`moderation:\$\{d\.id\}`\)\.length < 8\}/);
  assert.match(adminDashboard, /Review Evidence/);
  assert.match(adminDashboard, /Context signals/);
  assert.match(adminDashboard, /Score evidence/);
  assert.match(adminDashboard, /Payout tiers/);
  assert.match(adminDashboard, /dialogueSnippet/);
  assert.match(adminDashboard, /segmentSnippets/);
  assert.match(adminDashboard, /scoreDimensionRows/);
  assert.match(adminDashboard, /evidence messages/);
  assert.match(adminDashboard, /Messages:/);
  assert.match(adminDashboard, /evidenceSnippet/);
});

test("admin high-impact actions require explicit reasons", () => {
  assert.match(server, /function requiredAdminReason/);
  assert.match(server, /Admin reason is required for payout queueing/);
  assert.match(server, /Admin reason is required before marking payout disbursed/);
  assert.match(server, /Admin reason is required for flag override/);
  assert.match(server, /Admin reason is required for clearing strikes/);
  assert.match(server, /Admin reason is required for manual strikes/);
  assert.match(server, /payout_queued/);
  assert.match(server, /JSON\.stringify\(\{ reason/);
  assert.match(adminDashboard, /const \[actionReasons, setActionReasons\]/);
  assert.match(adminDashboard, /admin-reason-flag-/);
  assert.match(adminDashboard, /admin-reason-account-/);
  assert.match(adminDashboard, /reasonFor\(`account:\$\{a\.userId\}`\)\.length < 8/);
  assert.doesNotMatch(adminDashboard, /Admin dashboard decision:|Manual — admin/);
});

test("admin staff invites use a form instead of browser prompts", () => {
  assert.doesNotMatch(adminDashboard, /window\.prompt/);
  assert.match(adminDashboard, /staff-invite-form/);
  assert.match(adminDashboard, /staff-invite-email/);
  assert.match(adminDashboard, /staff-invite-role/);
  assert.match(adminDashboard, /btn-staff-invite-submit/);
  assert.match(adminDashboard, /staff-invite-result/);
  assert.match(adminDashboard, /expiresInHours/);
  assert.match(adminDashboard, /\/staff-invite\?token=/);
  assert.match(adminDashboard, /Enter a valid staff email/);
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

test("public config does not expose merchant account values", () => {
  const configRoute = server.slice(
    server.indexOf('app.get("/api/config"'),
    server.indexOf("// Profile update"),
  );
  assert.match(configRoute, /wipayConfigured/);
  assert.match(configRoute, /aiConfigured/);
  assert.match(configRoute, /wipayCountryCode/);
  assert.doesNotMatch(configRoute, /wipayMerchantAccount|WIPAY_ACCOUNT_NUMBER|Demo Gateway/);
});

test("environment template matches Chat2Cash production and local setup", () => {
  assert.match(envExample, /APP_URL=https:\/\/chat2cash\.mindwaveja\.com/);
  assert.match(envExample, /BETTER_AUTH_URL=https:\/\/chat2cash\.mindwaveja\.com/);
  assert.match(envExample, /DATA_DIR=\/opt\/mw\/chat2cash-data/);
  assert.match(envExample, /WIPAY_COUNTRY_CODE=JM/);
  assert.match(envExample, /TEST_ACCOUNT_PASSWORD=/);
  assert.match(envExample, /node -e "console\.log\(require\('crypto'\)\.randomBytes\(32\)\.toString\('hex'\)\)"/);
  assert.doesNotMatch(envExample, /purifier\.mindwaveja\.com|MY_APP_URL|WIPAY_COUNTRY_CODE="TT"|BETTER_AUTH_SECRET=generate-with/);
});

test("profile update validates fields and never returns or stores base64 ID images", () => {
  const profileHelpers = server.slice(
    server.indexOf("function sanitizeProfileForClient"),
    server.indexOf("// Cascading AI evaluator"),
  );
  const profileUpdate = server.slice(
    server.indexOf('app.post("/api/profile/update"'),
    server.indexOf("// Legacy registration endpoint"),
  );
  const meRoute = server.slice(
    server.indexOf('app.get("/api/me"'),
    server.indexOf("// Health check endpoint"),
  );

  assert.match(profileHelpers, /const \{ idPhoto, \.\.\.safeProfile \} = profile/);
  assert.match(profileHelpers, /idPhotoVerified: Boolean\(idPhoto\)/);
  assert.match(profileHelpers, /MAX_ID_PHOTO_BYTES/);
  assert.match(profileHelpers, /new URL\(wipayLink\)/);
  assert.match(profileHelpers, /ALLOWED_PROFILE_COUNTRIES/);
  assert.match(profileHelpers, /crypto\.createHash\("sha256"\)/);
  assert.match(profileHelpers, /idPhotoMarker = `verified-hash:v1:\$\{digest\}`/);
  assert.match(profileUpdate, /validateProfilePayload\(req\.body\)/);
  assert.match(profileUpdate, /database\.updateProfile\(userId, validated\.profile\)/);
  assert.match(profileUpdate, /sanitizeProfileForClient\(user\)/);
  assert.match(meRoute, /sanitizeProfileForClient\(user\)/);
  assert.doesNotMatch(profileUpdate, /idPhoto: idPhoto \|\| ""/);
  assert.doesNotMatch(profileHelpers, /\.\.\.safeProfile,\s*idPhoto:/);
});

test("contributors can preview before payout setup but cannot submit payable datasets without it", () => {
  const profileHelpers = server.slice(
    server.indexOf("function sanitizeProfileForClient"),
    server.indexOf("// Cascading AI evaluator"),
  );
  const submitJsonSection = server.slice(
    server.indexOf('app.post("/api/submit-json-draft"'),
    server.indexOf("// Helper: Securely strip timestamps"),
  );
  const processChatSection = server.slice(
    server.indexOf('app.post("/api/process-chat"'),
    server.indexOf("// Contributor requests a payout"),
  );
  const payoutQueueSection = server.slice(
    server.indexOf('app.post("/api/payouts"'),
    server.indexOf('app.post("/api/admin/payout-approve"'),
  );

  assert.match(profileHelpers, /function hasCompletePayoutProfile/);
  assert.match(profileHelpers, /payoutProfileRequiredMessage/);
  assert.match(profileHelpers, /if \(wipayAccount && !\/\^\[a-zA-Z0-9_/);
  assert.match(profileHelpers, /if \(wipayLink\) \{/);
  assert.match(submitJsonSection, /if \(!hasCompletePayoutProfile\(profile\)\)/);
  assert.match(processChatSection, /const \{ chatText, fileName, userId, draftOnly \} = req\.body/);
  assert.match(processChatSection, /if \(!draftOnly && !hasCompletePayoutProfile\(profile\)\)/);
  assert.match(payoutQueueSection, /Contributor must finish their WiPay payout profile before admin can queue payment/);
  assert.match(registrationForm, /WiPay details are only required before final paid submission/);
  assert.match(registrationForm, /CREATE PREVIEW ACCOUNT/);
  assert.match(fileProcessor, /Payout setup needed before final submit/);
  assert.match(fileProcessor, /payout-profile-setup-panel/);
  assert.match(fileProcessor, /review-payout-profile-setup-panel/);
  assert.match(fileProcessor, /btn-review-save-payout-profile/);
  assert.match(fileProcessor, /disabled=\{loading \|\| !hasPayoutProfile\}/);
});

test("text chat payouts use JMD launch settlement independent of profile country", () => {
  assert.match(server, /const TEXT_CHAT_PAYOUT_CURRENCY = "JMD"/);
  assert.match(server, /currency: TEXT_CHAT_PAYOUT_CURRENCY/);
  assert.doesNotMatch(server, /currency: profile\.country === "JM" \? "JMD" : profile\.country === "BB" \? "BBD" : "TTD"/);
  assert.match(registrationForm, /PROFILE COUNTRY/);
  assert.match(registrationForm, /Text-chat payout estimates are shown and cleared in JMD for launch/);
  assert.match(fileProcessor, /JMD text-chat settlement/);
});

test("registration explains standard payout without photo ID", () => {
  assert.match(registrationForm, /standard-payout-no-id-note/);
  assert.match(registrationForm, /Standard payout is available without a photo ID/);
  assert.match(registrationForm, /Leave this unchecked for standard payout with no ID upload/);
  assert.match(registrationForm, /PHOTO ID FOR MULTIPLIER REVIEW/);
  assert.match(registrationForm, /2X OPT-IN ONLY/);
  assert.match(registrationForm, /server stores only a one-way verification marker/);
  assert.doesNotMatch(registrationForm, /To satisfy standard data audits/);
  assert.doesNotMatch(registrationForm, /AUTHENTIC IDENTITY PHOTO CARD/);
});

test("maintenance backfill is dry-run by default and can migrate legacy ID photos", () => {
  assert.match(backfillScript, /const apply = process\.argv\.includes\("--apply"\)/);
  assert.match(backfillScript, /mode=\$\{apply \? "apply" : "dry-run"\}/);
  assert.match(backfillScript, /No changes written\. Re-run with --apply/);
  assert.match(backfillScript, /function backupDatabase\(\)/);
  assert.match(backfillScript, /bak-maintenance/);
  assert.match(backfillScript, /db\.transaction/);
  assert.match(backfillScript, /WHERE idPhoto LIKE 'data:image\/%;base64,%'/);
  assert.match(backfillScript, /verified-hash:v1:\$\{digest\}/);
  assert.match(backfillScript, /payoutVersion = metadata\.payoutVersion \|\| "c2c-payout-v5-mindwave-buyer"/);
  assert.match(backfillScript, /rate: 25/);
  assert.match(backfillScript, /maxRatePerPair: 200/);
  assert.match(backfillScript, /currency: "JMD"/);
  assert.match(backfillScript, /SET payoutAmount = \?, currency = \?, metadata = \?/);
  assert.doesNotMatch(backfillScript, /update\.run\(amount|units \* 0\.5|payoutRatePerUsefulLine \|\| 0\.5/);
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

test("upload entry explains raw export, review, submit, and WhatsApp ZIP recovery", () => {
  assert.match(fileProcessor, /upload-review-submit-guide/);
  assert.match(fileProcessor, /1\. Upload/);
  assert.match(fileProcessor, /2\. Review/);
  assert.match(fileProcessor, /3\. Submit/);
  assert.match(fileProcessor, /whatsappExportHelp/);
  assert.match(fileProcessor, /Without Media/);
  assert.match(fileProcessor, /No WhatsApp \.txt file was found inside that ZIP/);
  assert.match(fileProcessor, /Re-export the chat without media/);
  assert.match(fileProcessor, /download JSON or CSV before submitting/);
  assert.match(fileProcessor, /Final submit stores only sanitized content/);
});

test("production bundle and staff invite route are present", () => {
  assert.ok(fs.existsSync(path.join(root, "dist", "server.cjs")));
  const main = fs.readFileSync(path.join(root, "src", "main.tsx"), "utf8");
  assert.match(main, /StaffInvite/);
});
