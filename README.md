# MicroSkill — 1-Minute MicroMentor

MicroSkill is a tiny, focused PWA-like single-page app that turns a pasted gig/job description into:
- **5 micro-lessons** (actionable micro-tasks with practice tasks + example output),
- **2 profile blurbs** (short + long),
- **1 concise cover message** tuned for the job.

Built with React + Vite (frontend) and a small serverless API that delegates to OpenAI, Hugging Face or **Gemini (Google)**. The AI logic is centralized in `lib/aiClient.js` (single source of truth) and the prompts are centralized in `prompts/prompts.js`.

This repo is intentionally tiny and battle-ready for hackathons — cheap to run, easy to deploy.

---

## What’s new / why it’s safe to use
- **Single AI client (`lib/aiClient.js`)** — all provider logic and the demo fixture live here so behavior is identical across local, Netlify, and Vercel.
- **Single prompt source (`prompts/prompts.js`)** — change this file to tune the system/user prompt for all environments.
- **DEMO_MODE**: toggle `DEMO_MODE=true` to run fully offline canned responses (used by smoke-test).
- **Smoke test**: `lib/aiClient.test.js` starts a local server in DEMO mode and validates the JSON shape automatically.
- **Robust parsing & logging**: the server returns meaningful HTTP status codes and errors (so the frontend can surface friendly error messages), while server logs retain raw provider responses for debugging.

---

## Quick start (local)

1. Clone or copy the repository.
2. Copy example env and edit keys:
   ```bash
   cp .env.example .env
   # Then edit .env with your keys (or set DEMO_MODE=true for offline mode)
````

3. Install dependencies:

   ```bash
   npm install
   ```
4. Start the local API (the serverless adapter that the frontend will call):

   ```bash
   npm run start:api
   # by default listens on http://localhost:5174/api/generate
   ```
5. Start the frontend (Vite):

   ```bash
   npm run dev
   # open http://localhost:5173
   ```

If you want to skip API keys entirely for quick testing, set `DEMO_MODE=true` in `.env`. Demo output is returned from `lib/aiClient.js` (`DEMO_FIXTURE`) and is deterministic.

---

## Run the smoke test (recommended before demo/video)

This test verifies the entire request -> response path using the demo fixture.

```bash
# runs lib/aiClient.test.js which spawns the local server in DEMO_MODE
npm run test:smoke
```

Expected output:

```
[server] Local API server listening at http://localhost:5174/api/generate
SMOKE TEST SUCCESS: Demo response valid.
```

---

## Scripts in package.json

* `npm run dev` — start frontend (Vite)
* `npm run start:api` — start local API server (`local-api-server.js`)
* `npm run test:smoke` — run smoke test (spawns server with `DEMO_MODE=true` and validates output)
* `npm run build` — build frontend (Vite) for production

(If you add CI, `npm run test:smoke` is useful as a quick health-check job.)

---

## Where demo output lives (important)

The canned demo fixture used when `DEMO_MODE=true` lives in:

```
lib/aiClient.js  -> DEMO_FIXTURE
```

This single fixture is returned by the shared AI client for **all** wrappers (local, Netlify, Vercel). That guarantees identical demo behavior across environments.

---

## How to use provider selection

* From the frontend you can choose which provider to ask (OpenAI, HF, Gemini) by sending `provider: "openai"|"huggingface"|"gemini"` in the POST body. The server will use `DEFAULT_PROVIDER` from `.env` if none supplied.
* The server-side environment variables determine the provider keys and model names. See `.env.example` for defaults.

---

## Quick troubleshooting (most common issues)

* **No micro-lessons returned or parse error**

  * The server returns structured errors: `PROVIDER_ERROR`, `PARSE_ERROR`, `EMPTY_RESPONSE`. Inspect server logs for raw provider output (the raw model response is printed).
  * Check that `prompts/prompts.js` is correct. Model output depends on the exact prompt.
* **MODULE_TYPELESS_PACKAGE_JSON warning**

  * Fixed by making `prompts/prompts.js` a CommonJS module. No action needed.
* **Gemini 404 / model not found**

  * Use a supported Gemini model name (e.g., `gemini-2.5-flash` or `gemini-1.5-flash`); sometimes models require account access.
  * The client retries with `?key=` fallback if header auth fails, and logs both responses.
* **Large token requests**

  * We set `maxOutputTokens=10000` centrally, but models/providers may enforce lower hard limits. If the provider truncates, check logs.

---

## License

MIT — open for you to adapt during the competition.

---