# Chat2Cash 💬➡️💰

Chat2Cash is an innovative full-stack Web Application that converts private WhatsApp text chat threads into highly valuable, instruction-optimized training samples for Large Language Models (LLMs), with direct settlements paid in regional currencies (JMD, TTD, BBD, USD) via WiPay.

The solution ensures rigorous privacy standards by executing all sanitization and photo ID redactions locally inside the browser before data touches server-side interfaces.

---

## 🚀 Key Features

*   **Tactile Compliance & ID Redaction**: A custom identity component utilizing device cameras (and manual uploader) that places secure, permanent black redaction grids over faces and Taxpayer Registration Numbers (TRN) to satisfy compliance procedures without leaking sensitive details.
*   **Zero-Leak Local Anonymizer**: Text files are parsed and stripped of legal names, telephone numbers, emails, and dates directly in the client, mapping speaker terms to random pseudonym markers (e.g., *Speaker A*, *Speaker B*).
*   **Geographic Settlement Targeting**: Collects exact settlement location demographics with options for designated **Settlement Country** and a separate, dedicated **Town/City** submission field.
*   **Dual-Tier Demographic Multiplier**: Registers sellers with age, gender/identification (Male, Female, Intersex (formerly referred to locally as Hermaphrodite)), education levels, and household details, unleashing a **2x award payout multiplier** for opt-in demographic profiles.
*   **Interactive Help & FAQ Hub**: A responsive, categorized troubleshooting panel embedded in the home footer explaining processing timelines, pricing structures, and privacy practices.
*   **Gemini Evaluation Intelligence**: Employs Google's Gemini models server-side to assess training utility, scoring instructional density while discarding redundant chit-chat, automated system messages, and untranslatable/generic dialect.
*   **WiPay Caribbean Hub**: Logs validated proceeds straight onto a public reconciliation ledger with secure tracking IDs destined for user WiPay merchant pockets.

---

## 🛠️ Technology Stack

*   **Frontend**: React + TypeScript + Tailwind CSS + Lucide Icons + Motion (for route & tab animations)
*   **Backend**: Node.js + Express.js + TSX (direct execution)
*   **AI Engine**: `@google/genai` TypeScript SDK (server-side proxying)
*   **Build Tool**: Vite (bundling frontend) & Esbuild (bundling backend)

---

## 🏗️ Getting Started

### 1. Environment Configuration

Create a `.env` file in the root directory based on the `.env.example` blueprint. Add your Google Gemini API key:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_goes_here
```

### 2. Development Setup

To boot both the Express backend and the Vite frontend simultaneously, run:

```bash
# Install package dependencies
npm install

# Launch Development Server (Express on port 3000 proxies Vite hmr)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Compilation

Compile both client-side static bundles and the bundled CommonJS backend:

```bash
# Build Vite client files & compile server.ts to dist/server.cjs
npm run build

# Start production server
npm run start
```

---

## 🔒 Security & Privacy Guarantees

*   **In-Browser Redaction**: Both the dialogue text string replacements and the ID Photo mask-overlays run inside the client's memory sandbox. The server only receives fully anonymized arrays and pre-redacted images.
*   **WiPay Clear Path**: Real transaction clearing times take **7-14 business days** under strict fraud and model-integrity checks to prevent synthetic dialogue spam.
