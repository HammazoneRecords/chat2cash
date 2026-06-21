# Chat2Cash Professional User Manual & Audit Guide 📓💬➡️💰

Welcome to the **Chat2Cash** complete user manual and system administration reference. This document outlines the architectural flow, security mechanisms, compliance rules, file formatting standards, and WiPay settlement details for our unified Caribbean data hub. 

The application utilizes strict client-side anonymization and local photo ID redactions to ensure that sensitive physical identities and raw text records never cross the server boundaries. 

---

## 📂 Table of Contents
1. [Platform Architecture & Data Privacy Controls](#1-platform-architecture--data-privacy-controls)
2. [Seller Account Registration Guidelines](#2-seller-account-registration-guidelines)
3. [Geographic Targeting & Demographic Multipliers](#3-geographic-targeting--demographic-multipliers)
4. [KYC Photo ID Capture & Shield Alignments](#4-kyc-photo-id-capture--shield-alignments)
5. [WhatsApp Export Formatting Instructions](#5-whatsapp-export-formatting-instructions)
6. [Local Anonymization Parse Heuristics](#6-local-anonymization-parse-heuristics)
7. [Gemini AI Scoring, Utility Categories & Rule Matrix](#7-gemini-ai-scoring-utility-categories--rule-matrix)
8. [WiPay Settlement Ledger & Cryptographic Verification](#8-wipay-settlement-ledger--cryptographic-verification)
9. [Frequently Asked Questions (Faq)](#9-frequently-asked-questions-faq)

---

## 1. Platform Architecture & Data Privacy Controls

Chat2Cash functions under a **local-computation first** methodology. It treats the user's web page as a sandbox.

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
  │       SECURE BACKEND & GEMINI       │
  │                                     │
  │  • Assess instructional densities   │
  │  • Append clearance transaction logs │
  └─────────────────────────────────────┘
```

By ensuring that text-parsing regex replacements run inside the web browser client, we prevent cleartext conversations from leaking should database servers ever be compromised. Your original conversation drafts and unmasked identification cards are never transmitted over HTTP networks.

---

## 2. Seller Account Registration Guidelines

Before submitting WhatsApp records to the data pool, users must establish an authenticated **Disbursement Node** by registering their profile:

1.  **Full Legal Name**: Must exactly match your state-issued photo ID used during the compliance stage. Misaligned registry strings will delay verification during reconciliation audits.
2.  **Email Address**: Used for billing confirmations, receipt exports, and transaction alerts.
3.  **Active Mobile Number**: Used to communicate critical network update pings.
4.  **WiPay Merchant Wallet ID**: Your unique, digital account identifier on the WiPay network. Payouts are pushed directly to this merchant node. Must consist of numeric strings (e.g., `1908273`). Ensure that this is entered without spaces or letters.

---

## 3. Geographic Targeting & Demographic Multipliers

Our custom billing multiplier algorithm adjusts payouts according to the demographic depth of the seller. Deep data representation translates to higher LLM model value.

### Settlement Location Fields:
*   **Settlement Country**: Dropdown options configuring your local regional banking zone:
    *   🇯🇲 **Jamaica (JM)** — Base payout calculated and paid in Jamaican Dollars (JMD).
    *   🇹🇹 **Trinidad & Tobago (TT)** — Base payout calculated and paid in TTD.
    *   🇧🇧 **Barbados (BB)** — Base payout calculated and paid in BBD.
    *   🌐 **Cayman / International (Ky/Other)** — Cleared in local equivalents.
*   **Town / City**: A dedicated separate input field to submit the local town/parish/community where you live and transact (e.g., *Kingston*, *Portmore*, *San Fernando*, *Bridgetown*, *May Pen*, *Montego Bay*). This is logged securely to support accurate regional geolocation training variables.

### Demographic & Identifiers:
*   **Age Profile**: A numeric select field starting from 18 to verify legal compliance with Caribbean transaction frameworks.
*   **Gender Selection**: Curated to three specific categories for fine-tuning dialogue weights:
    *   `Male`: Structured masculine conversational patterns.
    *   `Female`: Structured feminine conversational patterns.
    *   `Intersex (formerly referred to locally as Hermaphrodite)`: Dual biological identifier mapping representation. (*Note: General placeholders like "Prefer not to say" or vague selections have been removed to ensure dataset precision*).
*   **Opt-in Payout Multiplier**: By checking the **2x Demographic Opt-in** flag AND completing the optional fields, your base reward density is immediately **multiplied by an autoconfigured 2.0x factor**. This requires filling out:
    *   *Highest Level of Education*: Select from CXC High School, CAPE/A-Level, Associate Degree, Bachelor's Degree, Post-Graduate, or Trade/Vocational.
    *   *Institution/School Name*: Enter the specific regional school or college attended (e.g., *University of the West Indies*, *UTech*, *COSTAATT*).
    *   *Single-Parent Household*: Toggle setting to enrich sociological dataset demographics.

---

## 4. KYC Photo ID Capture & Shield Alignments

The secure Photo Identity confirmation step is **optional by default**. It is **only required if you choose to opt in for the 2x Demographic Payout Multiplier** (which triggers more detailed profiling compliance validation). For basic rate dialogue submissions, the Photo ID upload can be completely bypassed. When active, this module works with high-contrast mask cards overlays.

### Interactive Capture Walkthrough:
1.  **Activate Feed**: Click **Capture with Camera** to open your integrated camera feed. You must grant the app camera access in your browser.
2.  **Choose ID Alignment Theme**:
    *   **Face Left (Standard Licence)**: Places custom overlay blocks covering the left side portion (matching local Jamaican, Barbadian, and Trinidadian Driver's Licences) and a top-right rectangular redacted block for Taxpayer Numbers (TRN).
    *   **Face Right**: Rotates the alignment blocks to map cards holding identification graphics on the right half.
    *   **Full Center Cover**: Masks the entire center profile of the card.
3.  **Position Card**: Hold your physical card behind your computer/phone camera lens. Ensure that your face and the serial digits are lined up inside the protective dashed outlines.
4.  **Snap & Redact**: Click **Snap & Redact**. The system pulls the active Frame, loads it onto a hidden HTML5 canvas context, burns permanent `#030712` (98% solid black) privacy masking patches with "FACE AREA COVERED" and "TRN REDACTED" text stamps, and wipes the raw feed from browser memory.
5.  **Manual Document Upload Option**:
    *   If you lack a live camera, configure your **ID Alignment Theme** (Left, Right, or Center) and click **Upload Document**.
    *   The file is loaded directly into the client canvas, where the same permanent redaction coordinates are instantly burned into the pixels.
    *   The resulting blackened image is shown under the **Secure Anonymized ID Output** box, ready to submit securely.

---

## 5. WhatsApp Export Formatting Instructions

Conversation files must be exported directly from the primary mobile or desktop WhatsApp interfaces as plain text files:

1.  Open **WhatsApp** and navigate to your private conversational thread.
2.  Tap on the contact's name at the head of the screen to load settings.
3.  Scroll down to the footer options and choose **Export Chat**.
4.  **Critical Boundary**: Standard prompt training demands selecting **Without Media** (attachments, voice notes, photos, and video formats cannot be validated and will trigger compile errors).
5.  Save the resulting `.txt` file, or save the `.zip` containing the compressed archive directly to your file system.

---

## 6. Local Anonymization Parse Heuristics

When you select your chat file and press **Upload and Analyze Dialogue**, the sanitization engine parses sequential lines using strict regex engines matching standard WhatsApp outputs:

### Evaluated Message Formats:
*   **Format Type A (Bracketed OS Style)**: `[18/06/2026, 14:10:45] Sender Name: Text Content`
*   **Format Type B (Standard Android Style)**: `18/06/2026, 14:10 - Sender Name: Text Content`
*   **Format Type C (ISO Standard Standard)**: `[2026-06-18 14:10:45] Sender Name: Text Content`

### Automated Cleansing Routine:
1.  **Strip Timestamps**: Times, dates, timezone logs, and brackets are completely sliced and deleted.
2.  **Participant Pseudonym Mapping**: Individual sender names (e.g. `Sarah Johnson` or `+18765432101`) are pushed onto a sequential Map memory cache block. Each distinct sender is converted to a dynamic tag:
    *   Sender 1 ➡️ `Speaker A`
    *   Sender 2 ➡️ `Speaker B`
    *   Sender 3 ➡️ `Speaker C`
3.  **Pattern Filtering**: Standard regular expressions seek and replace:
    *   *Telephone Numbers*: Dial codes matching country digits (`+1-876`, `1-868`, `+1-246`) or local seven-digit listings are randomized to `+1876-000-0000`.
    *   *Emails*: Standard address patterns (`user@email.com`) are converted to `[REDACTED_EMAIL]`.
    *   *Privacy Exclusions*: System notifications, encryption warnings, security change alerts, and file omitted reports are immediately bypassed.

---

## 7. Gemini AI Scoring, Utility Categories & Rule Matrix

After local sanitization converts raw chats to an anonymous dialogue payload array, Chat2Cash initiates a server-to-server validation call using **Google Gemini 3.5 Flash** for deep qualitative categorization. 

```
  Dialogue Sequence ──► [Gemini 3.5 Flash Evaluation Model] ──► JSON Report: Suitability, Categories, Utility Flags
```

### The 4 Crucial Data Evaluation Classes:

| Category | Description / Heuristics | Useful? | Earnings Valuation |
| :--- | :--- | :--- | :--- |
| **Informational** | Conversational sequences containing clear questions, technical answers, factual descriptions, or problem-solving parameters. | ✅ **Yes** | Standard Base Rate ($0.50-$1.00 JMD) multiplied by your suitability multiplier. |
| **Task-oriented** | Instructions, recipe explanations, guides, code assistance, structured plans, or explicit task execution sequences. | ✅ **Yes** | Standard Base Rate ($0.50-$1.00 JMD) multiplied by your suitability multiplier. |
| **Greetings** | Repetitive short phrases ("hello", "hey", "good morning"), system alerts, or single-word indicators. | ❌ **No** | $0.00 JMD (Filtered out from final sum) |
| **Noise & Laughs** | Extended text sequences with no instructional material, laugh loops ("lol", "lmao", "😂", "unreal"), or chat filler. | ❌ **No** | $0.00 JMD (Filtered out from final sum) |
| **Untranslatable Patois** | Text blocks consisting entirely of heavy, non-standard slang or Patois dialect that is logically impossible to translate into Standard English instruction-sets. | ❌ **No** | $0.00 JMD (Filtered out from final sum) |

### Payout Pricing Equation:
$$\text{Payout Amount} = \text{Total Useful Lines} \times \left( \text{Base Rate} \times \text{Demographic Multiplier} \times \frac{\text{Gemini Suitability Score}}{100} \right)$$

*   **Base Rate**: Starts at `$0.50 JMD` per useful dialog line.
*   **Demographic Multiplier**: Doubles your rate (`2x`) if you opt-in and complete your demographic background questionnaire.
*   **Suitability Score**: Calculated dynamically by the Gemini AI agent from `0` to `100` based on dialogue turn counts, conversational usefulness, and formatting cleanliness.

---

## 8. WiPay Settlement Ledger & Cryptographic Verification

Upon a successful quality audit:
1.  **Claim Disbursement**: Select the "Claim Disbursement" action inside the active file processor module.
2.  **Ledger Submission**: Transactions are assigned a cryptographic token code and a unique transaction ID (`TX-XXXXXXXX`).
3.  **Verification Registry**: Navigate to the **Public Ledger** tab to view your current disbursement pipeline. This acts as a transparent registry for tracking your WiPay payout queue.
4.  **Funds Settlement Pipeline**:
    *   **7-14 Business Days**: The platform holds settlement funds in escrow to run secondary anti-collusion filters.
    *   Once confirmed, WiPay digital disbursements are processed and pushed straight into your registered merchant wallet.

---

## 9. Frequently Asked Questions (FAQ)

### Q: Why did some of my conversational turns return as "Not Useful" / Zero Earnings?
A: Our Gemini trainer model strictly prioritizes instruction-tuning training pairs. Chat sequences containing only empty greetings ("goodnight", "ok cool"), automated system signals ("Media omitted", "Missed call"), or dialogue logs that cannot be translated between Patois and standard English hold zero utility for training LLM chatbot models.

### Q: Why is there a 7-14 business days waiting period?
A: This delay matches WiPay's automated clearinghouse AML procedures. It allows for auditing checks to protect the target LLM and ensure security alignment across all digital developer pools.

### Q: Do I need to submit a Photo ID to use Chat2Cash?
A: **No, it is optional by default.** You do not need to upload or snap any photo ID for standard-rate chat exports. The secure photo ID step is **only mandatory if you choose to opt-in for the premium 2x Demographic Multiplier**, where additional validation compliance is required. When uploaded, it is processed locally in browser memory so only redacted versions are saved.

### Q: When will Chat2Cash begin paying out for Voice Notes?
A: Voice Note and audio dialog datasets with rich Caribbean dialects represent highly valued models for speech synthesis. We are finalizing our browser-based audio transcriber. In the meantime, you can sign up for instant notifications directly from **Step // 04 (Vocal Audio Payouts)** in the Home View's "How It Works" layout.

---
### 🔒 Certified Privacy Protocol compliant under Chat2Cash Secure Data Hub standards.
