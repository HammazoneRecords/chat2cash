# Chat2Cash User Manual

---

## Table of Contents
1. [Platform Architecture & Privacy](#1-platform-architecture--privacy)
2. [Seller Account Registration](#2-seller-account-registration)
3. [Geographic & Demographic Multipliers](#3-geographic--demographic-multipliers)
4. [KYC Photo ID Capture](#4-kyc-photo-id-capture)
5. [WhatsApp Export Instructions](#5-whatsapp-export-instructions)
6. [Local Anonymization](#6-local-anonymization)
7. [AI Scoring & Utility Categories](#7-ai-scoring--utility-categories)
8. [WiPay Settlement](#8-wipay-settlement)
9. [FAQ](#9-faq)

---

## 1. Platform Architecture & Privacy

Chat2Cash is **local-computation first**. Your browser handles all anonymization before anything reaches the server.

```
       [Raw Text File / Live ID Photo]
                     │
                     ▼
  ┌─────────────────────────────────────┐
  │         LOCAL BROWSER SANDBOX       │
  │                                     │
  │  • Replace numbers/names in memory  │
  │  • Apply blackout blocks to canvas  │
  │  • Destroy unredacted source files  │
  └──────────────────┬──────────────────┘
                     │
                     │  (Fully Purified JSON & Pre-Masked PNG only)
                     ▼
  ┌─────────────────────────────────────┐
  │          SECURE BACKEND             │
  │                                     │
  │  • Assess instructional densities   │
  │  • Append clearance transaction logs │
  └─────────────────────────────────────┘
```

Your original conversation drafts and unmasked identification cards are never transmitted over any network.

---

## 2. Seller Account Registration

Before submitting WhatsApp records, register your profile:

1. **Full Legal Name** — must match your photo ID
2. **Email Address** — for receipts and transaction alerts
3. **Active Mobile Number** — for critical update pings
4. **WiPay Merchant Wallet ID** — your numeric WiPay account ID (e.g. `1908273`)
5. **WiPay Payout Link** — your personal WiPay payout URL

---

## 3. Geographic & Demographic Multipliers

### Settlement Country
- 🇯🇲 **Jamaica (JM)** — payouts in JMD
- 🇹🇹 **Trinidad & Tobago (TT)** — payouts in TTD
- 🇧🇧 **Barbados (BB)** — payouts in BBD
- 🌐 **Cayman / International** — USD equivalent

### Town / Parish
Log your local community for regional geolocation training variables.

### Demographic Opt-in (2x Multiplier)
Tick **Opt-in for 2x Payout Multiplier** and complete:
- Highest education level
- School/institution name
- Single-parent household flag

This doubles your base payout rate on all submitted turns.

---

## 4. KYC Photo ID Capture

Optional by default — **only required for the 2x Demographic Multiplier**.

1. Click **Capture with Camera** (or **Upload Document**)
2. Choose your ID alignment (Face Left, Face Right, Full Center)
3. Align the card — click **Snap & Redact**
4. The system burns permanent black overlays over your face and TRN in-browser, then discards the raw image from memory

The server only receives the redacted PNG.

---

## 5. WhatsApp Export Instructions

1. Open WhatsApp → navigate to your conversation
2. Tap the contact name → scroll to **Export Chat**
3. Select **Without Media**
4. Save the `.txt` or `.zip` to your device

---

## 6. Local Anonymization

When you press **Analyze Interaction Pool**, the browser parser handles three WhatsApp export formats:

- **Format A**: `[18/06/2026, 14:10:45] Sender Name: Text`
- **Format B**: `18/06/2026, 14:10 - Sender Name: Text`
- **Format C**: `[2026-06-18 14:10:45] Sender Name: Text`

**What gets stripped:**
1. All timestamps and dates
2. Sender names/phone numbers → replaced with `Speaker A`, `Speaker B`, etc.
3. Phone numbers in text → `[Phone Redacted]`
4. Email addresses → `[Email Redacted]`
5. System messages (omitted media, missed calls, encryption notices) → removed

---

## 7. AI Scoring & Utility Categories

After local sanitization, ambiguous dialogue pairs are evaluated by the AI engine for quality scoring.

| Category | Useful? | Earnings |
|---|---|---|
| **Informational** — clear questions, factual answers, problem-solving | ✅ Yes | $0.50–$4 JMD per turn |
| **Task-oriented** — instructions, guides, structured plans | ✅ Yes | $0.50–$4 JMD per turn |
| **Greetings** — "hello", "ok cool", single-word fillers | ❌ No | $0 JMD |
| **Noise** — laugh loops (lol, lmao, 😂), empty chatter | ❌ No | $0 JMD |
| **Untranslatable Patois** — heavy dialect with no translatable English equivalent | ❌ No | $0 JMD |

### Payout Formula

```
Payout = Total Useful Turns × Rate Per Turn
Rate   = $0.50–$4 JMD (quality-scaled by AI suitability score 0–100)
         × 2 (if demographic opt-in is active)
```

Currency guide: JMD 1,000 ≈ TTD 46 ≈ BBD 8.80

---

## 8. WiPay Settlement

1. After analysis, click **Claim Disbursement**
2. A transaction ID is assigned and logged to the Public Ledger
3. **7-14 business days** clearing window — anti-collusion and fraud checks
4. Funds pushed to your registered WiPay merchant wallet

---

## 9. FAQ

**Q: Why did some turns return as "Not Useful"?**
Our AI evaluation prioritizes instruction-following training pairs. Short greetings, system notifications, laugh exchanges, and dialect that cannot be translated to standard English hold zero utility for LLM training.

**Q: Why 7-14 days?**
This matches WiPay's AML clearinghouse procedures and gives us time to verify submissions aren't synthetic or duplicate.

**Q: Do I need to upload a Photo ID?**
No. Photo ID is only required if you opt in for the 2x Demographic Multiplier. For standard submissions, skip it entirely.

**Q: When do Voice Notes launch?**
Voice note payouts are coming in Phase 2. Sign up for instant notification via **Step // 04 (Vocal Audio Payouts)** on the home page, or click **Voice Notes — Get Notified** in the hero.
