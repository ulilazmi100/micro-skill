# MicroSkill — 1-Minute MicroMentor

MicroSkill turns a pasted gig/job description into a concise practice pack for gig workers:
**5 micro-lessons** (small actionable tasks with practice prompts + example outputs), **2 profile blurbs** (short + long), and **1 cover message** tuned to the job description. Built as a tiny React + Vite app with serverless wrappers that delegate to OpenAI, Hugging Face, or Gemini.

This README is practical: run locally, test offline with `DEMO_MODE`, deploy to Vercel/Netlify, and understand common failure modes + fixes.

---

## Highlights / Why this repo is useful

* **Tiny and deployable** — React + Vite frontend and thin serverless wrappers for Netlify / Vercel (same AI client).
* **Single source of truth** for AI behavior: `lib/aiClient.js` (providers + demo fixture).
* **Single prompt source**: `prompts/prompts.js` — change this to tune model behavior everywhere.
* **Safe offline demo**: set `DEMO_MODE=true` for deterministic output (used by the smoke test).
* **Smoke test**: `npm run test:smoke` validates the local API + demo fixture.

---

## Quick file map (important files)

* `src/` — React app (Vite, Tailwind)

  * `src/components/MicroSkillForm.jsx` — main form + UI
  * `src/components/MicroLessonCard.jsx` — lesson card + expansion/hint fetching
  * `src/utils/api.js` — frontend → function request helpers
* `prompts/` — prompts and demo fixture

  * `prompts/prompts.js` — system & builder prompts (JSON constraints)
  * `prompts/demo_fixture.js` — canned demo response (DEMO_MODE)
* `lib/aiClient.js` — unified AI client (OpenAI / HuggingFace / Gemini + parsing + demo)
* Server wrappers:

  * `local-api-server.js` — local Express wrapper
  * `api/generate.js` — Vercel serverless wrapper
  * `netlify/functions/generate.js` — Netlify wrapper
* `lib/aiClient.test.js` — smoke test that spawns `local-api-server.js` with `DEMO_MODE=true`

---

## Quick Start (local)

1. Clone repo and install:

```bash
git clone <your-repo>
cd micro-skill
npm install
```

2. Copy example environment file:

```bash
cp .env.example .env
```

3. For quick offline testing (no API keys), set `DEMO_MODE=true` in `.env` and also:

```
VITE_DEMO_MODE=true
```

4. Start the local API and frontend in two terminals:

```bash
npm run start:api   # local serverless adapter: http://localhost:5174/api/generate
npm run dev         # frontend: http://localhost:5173
```

5. Open the app in the browser (default: `http://localhost:5173`), paste a job description, choose a provider (or use demo), and click **Generate**.

---

## Smoke test (recommended before sharing/demo)

The repo includes a smoke test that runs the local API in demo mode and validates the JSON shape.

```bash
npm run test:smoke
```

Expected brief output (if everything OK):

```
[server] Local API server listening at http://localhost:5174/api/generate
SMOKE TEST SUCCESS: Demo response valid.
```

---

## Environment variables

**Server-side (do not commit):**

```
OPENAI_API_KEY=sk-...
HUGGINGFACE_API_KEY=hf-...
GEMINI_API_KEY=...
HF_MODEL=mistralai/Mistral-7B-Instruct-v0.3
GEMINI_MODEL=gemini-2.5-flash
OPENAI_MODEL=gpt-3.5-turbo
DEFAULT_PROVIDER=openai
DEMO_MODE=false
LOCAL_API_PORT=5174      # optional override for local server
```

**Client-side (Vite — prefix with `VITE_`):**

```
VITE_DEFAULT_PROVIDER=openai
VITE_FUNCTION_PATH=/api/generate       # Vercel default
# On Netlify: VITE_FUNCTION_PATH=/.netlify/functions/generate
VITE_DEMO_MODE=false
```

---

## How generation works (overview)

1. Frontend sends a POST to `FUNCTION_PATH` (`/api/generate` by default) with `{ jobTitle, skillLevel, strengths, platform, jobDesc, provider }`.
2. Server wrapper builds the prompt using `prompts/prompts.js` and passes it to `lib/aiClient.js`.
3. `lib/aiClient.js` calls the selected provider (OpenAI, HF, or Gemini). In `DEMO_MODE=true` it returns the canned `prompts/demo_fixture.js`.
4. Wrapper returns the parsed JSON to the frontend; expansions/hints are fetched on-demand via `action: 'fetch_expansion'` / `'fetch_hint'`.

**Important:** `prompts/prompts.js` expects perfectly-formed JSON from the model (strict shape). Demo fixture provides that shape deterministically.

---

## Common errors & how to debug

* **API returns `PARSE_ERROR` or `EMPTY_RESPONSE`**

  * Cause: provider returned plain text or malformed JSON.
  * Actions:

    * Inspect server logs — `lib/aiClient.js` logs raw provider responses.
    * Try `DEMO_MODE=true` to confirm the frontend flow is okay.
    * If using OpenAI/HF/Gemini, reduce `maxOutputTokens`, or adjust the prompt to ask the model to return JSON inside triple backticks.

* **Gemini 404 / model not found**

  * Use an accessible Gemini model for your account (try `gemini-1.5-flash` or `gemini-2.5-flash`).
  * Check that `GEMINI_API_KEY` is set and authorized for the target model.

* **Truncated output**

  * Providers enforce hard token limits. If you request very long expansions, the model may truncate.
  * Reduce `maxOutputTokens` or make the prompt request a shorter JSON result.

* **No micro-lessons returned**

  * The wrapper returns `{ error: "MISSING: jobDesc" }` if job description is empty — include a job description.
  * If provider returned non-JSON, `PARSE_ERROR` will be thrown — check server logs.

---

## Recommended improvements (small, safe changes to improve reliability)

These are optional but will dramatically improve UX in real runs:

1. **Normalize token option names** in `lib/aiClient.js` so all providers respect a single `maxOutputTokens` setting. This prevents accidental truncation.
2. **Add post-parse schema validation** to enforce required keys, word counts and return helpful `warnings` instead of throwing `PARSE_ERROR` immediately.
3. **Add a small retry/cleanup step**: if the model returns non-JSON, call it once more with an explicit prompt: “You returned invalid JSON; return only the cleaned JSON object (no commentary)”. This improves robustness but costs an extra model call.
4. **Tighten prompts**: ask models to wrap JSON in triple backticks and a single root object; models often follow this reliably.
5. **Harden smoke test** to validate against a JSON schema, not hard-coded lesson counts (or allow expected count to be configurable).

---

## Deployment notes

### Vercel

* Import repo into Vercel, set build command `npm run build` and output dir `dist`.
* Add server env variables in Vercel dashboard (server-side keys: `OPENAI_API_KEY`, etc).
* Vercel will serve your serverless function at `/api/generate` which matches the default client path.

### Netlify

* Build command: `npm run build` and publish directory `dist`.
* Add env vars in Site settings.
* IMPORTANT: set `VITE_FUNCTION_PATH=/.netlify/functions/generate` in Netlify env vars so the client points to Netlify functions.

---

## Developer tips

* Use `DEMO_MODE=true` to develop the UI offline without API keys.
* Use `npm run start:api` + `npm run dev` during UI development.
* Use `lib/aiClient.test.js` for CI smoke tests (it spawns the local server in demo mode and validates output shape).

---

## Contributing

1. Fork and create a feature branch.
2. Add tests where relevant (there’s a smoke test example).
3. Open a PR with a short explanation of changes.
4. Keep `prompts/prompts.js` and `prompts/demo_fixture.js` synchronized — demo output must match prompt expectations exactly.

---

## License

MIT — see `LICENSE` in this repo.

---

## Example quick commands

```bash
# Local dev
cp .env.example .env
# (optional) set DEMO_MODE=true in .env for offline testing
npm install
npm run start:api   # local server
npm run dev         # local frontend

# Smoke test
npm run test:smoke

# Build for production
npm run build
```

---

## Contact / Questions

If you run into a provider-specific issue, inspect `lib/aiClient.js` logs first (it prints raw provider responses and HTTP details). If you want, I can:

* patch `lib/aiClient.js` to normalize options and add a graceful JSON-recovery retry, or
* add schema validation and friendly `warnings` in the response.