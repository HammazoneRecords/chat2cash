# Hybrid Data Curation Operating Runbook 📘📋

This runbook guides engineers, operators, and data auditors in managing, deploying, monitoring, and troubleshooting the hybrid offline-first classification pipeline for Chat2Cash.

---

## 1. System Administration & Server Topology

The Chat2Cash data curation pipeline is deployed in high-availability Cloud Run containers, with reverse proxies routing external requests directly through Port `3000`.

- **Primary Entrypoint**: `/server.ts` (Running Express + Vite Middleware)
- **Engine Process**: Integrates local Javascript/Typescript heuristics with remote validation via Google Generative AI (`@google/genai`).
- **AI Core**: Powered by the highly modern `gemini-3.5-flash` model mapping server-side.

---

## 2. Standard Operating Procedures

### A. Deploying Code & Schema Modifications
Whenever pre-filtering heuristics (e.g. patois keyword collections or regex selectors) are added or modified:
1. Validate syntax locally by running the target bundler check:
   ```bash
   npm run lint
   ```
2. Verify production compilation and bundle assets using Esbuild:
   ```bash
   npm run build
   ```
3. Boot the environment and confirm external Port binding:
   ```bash
   npm run start
   ```

### B. Troubleshooting "API Key Limit" or Failures
If the remote Gemini API key suffers from regional throttle limits or becomes network-inaccessible:
1. Check the local `.env` configuration mapping. A valid `GEMINI_API_KEY` must be loaded.
2. Observe application logs inside the container console.
3. The server is programmed with automatic **smart statistical heuristics fail-safe**. If the API throws:
   - Dialogue evaluation immediately falls back to length-based keyword density heuristics.
   - Payout calculations remain active using localized rule-based estimates.
   - A descriptive warning is printed to the system logs, allowing users to proceed with zero downtime.

---

## 3. Customizing Pre-Filtering Rules

To augment or refine the local static rules without requesting model edits, modify the screening arrays directly in `/server.ts` inside the `process-chat` endpoint.

### Recommended Pattern for Adding New Keywords:
```ts
// Example: Adding new regional Caribbean jargon to the local filter
const additionalPatoisKeywords = ["dunno", "bredda", "dawg"];
```

---

## 4. Verification Checklists

- **Linter Status**: Must remain green pre-commit.
- **Vocal Notifications**: Verify the Mail sub-system in Stage 4 returns a secured "Notify Me" message on client email sign-up.
- **Redaction Canvas Integrity**: Redactions must perform locally inside the browser memory block before saving profiles.
