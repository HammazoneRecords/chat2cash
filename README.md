# Chat2Cash 💬➡️💰

Chat2Cash converts private WhatsApp text chat threads into anonymized training samples for MindWave, with launch settlement in JMD via WiPay after review.

The solution ensures rigorous privacy standards by executing all sanitization and photo ID redactions locally inside the browser before data touches server-side interfaces.

---

## 🚀 Key Features

*   **Tactile Compliance & ID Redaction**: A custom identity component utilizing device cameras (and manual uploader) that places secure, permanent black redaction grids over faces and Taxpayer Registration Numbers (TRN) to satisfy compliance procedures without leaking sensitive details.
*   **Browser-Only Review Privacy**: Text files are read and sanitized in the browser; original lines remain available only in local review memory while submitted records contain sanitized dialogue and relative timing metadata.
*   **Geographic Profile Context**: Collects country and town metadata for contributor context; launch text-chat settlement is JMD.
*   **Dual-Tier Demographic Multiplier**: Registers sellers with age, gender/identification (Male, Female, Intersex (formerly referred to locally as Hermaphrodite)), education levels, and household details, unleashing a **2x award payout multiplier** for opt-in demographic profiles.
*   **Interactive Help & FAQ Hub**: A responsive, categorized troubleshooting panel embedded in the home footer explaining processing timelines, pricing structures, and privacy practices.
*   **DeepSeek Evaluation Intelligence**: Employs DeepSeek's `deepseek-chat` model server-side to assess training utility while preserving clear Patois, code-switching, follow-up context, and cultural insight.
*   **WiPay Caribbean Hub**: Stores payout setup for reviewed datasets; admins manually disburse approved JMD payouts and record receipt proof.

---

## 🛠️ Technology Stack

*   **Frontend**: React + TypeScript + Tailwind CSS + Lucide Icons + Motion (for route & tab animations)
*   **Backend**: Node.js + Express.js + TSX (direct execution)
*   **AI Engine**: `deepseek-chat` API (server-side, via native `fetch`)
*   **Build Tool**: Vite (bundling frontend) & Esbuild (bundling backend)
*   **Package Manager**: pnpm 10.33.0 via Corepack

---

## 🏗️ Getting Started

### 1. Environment Configuration

Create a `.env` file in the root directory based on the `.env.example` blueprint. Add your DeepSeek API key:

```env
DEEPSEEK_API_KEY=your_actual_deepseek_api_key_goes_here
```

### 2. Development Setup

To boot both the Express backend and the Vite frontend simultaneously, run:

```bash
# Install package dependencies
corepack pnpm install

# Launch Development Server (Express on port 3000 proxies Vite hmr)
corepack pnpm dev
```

Open [http://localhost:4001](http://localhost:4001) in your browser.

### 3. Production Compilation

Compile both client-side static bundles and the bundled CommonJS backend:

```bash
# Build Vite client files & compile server.ts to dist/server.cjs
corepack pnpm run build

# Start production server
corepack pnpm start
```

---

## 🔒 Security & Privacy Guarantees

*   **In-Browser Redaction**: Both the dialogue text string replacements and the ID Photo mask-overlays run inside the client's memory sandbox. The server only receives fully anonymized arrays and pre-redacted images.
*   **WiPay Clear Path**: Real transaction clearing times take **7-14 business days** under strict fraud and model-integrity checks to prevent synthetic dialogue spam.
