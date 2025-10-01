# Deployment & Gemini Setup Guide (MicroSkill)

This guide helps you deploy MicroSkill to Vercel or Netlify and explains how to set up Gemini (Google Generative Language). It also covers environment variables, common pitfalls, and recommended production settings.

---

## Files of interest (single-source-of-truth)

* `prompts/prompts.js` — **single** prompt & user-prompt template used by all wrappers.
* `lib/aiClient.js` — unified AI client (DEMO_FIXTURE, providers, parsing, retries, logging).
* Wrappers (thin adapters):

  * `local-api-server.js` (local express)
  * `api/generate.js` (Vercel)
  * `netlify/functions/generate.js` (Netlify)
* Smoke test: `lib/aiClient.test.js` (spawns local server in DEMO_MODE and validates JSON)

---

## Recommended quick local test (safe, offline)

1. Copy `.env.example`:

   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and set:

   ```
   DEMO_MODE=true
   VITE_DEMO_MODE=true
   ```
3. Install and start:

   ```bash
   npm install
   npm run start:api
   npm run dev
   ```
4. Open the frontend: `http://localhost:5173` — the UI will call the local API and show the deterministic demo fixture.

Run smoke test:

```bash
npm run test:smoke
```

---

## Vercel deployment (recommended for simplicity)

1. Push your repo to GitHub (or GitLab).
2. On Vercel, create a new project and import the repo.
3. Build settings:

   * Framework: **Vite/React** (Vercel will detect it)
   * Build Command: `npm run build`
   * Output Directory: `dist`
4. Environment variables: add the server-side and client-side variables:

   * `OPENAI_API_KEY` (optional)
   * `HUGGINGFACE_API_KEY` (optional)
   * `GEMINI_API_KEY` (optional)
   * `HF_MODEL` (e.g., `mistralai/Mistral-7B-Instruct-v0.3`)
   * `GEMINI_MODEL` (e.g., `gemini-2.5-flash`)
   * `OPENAI_MODEL` (e.g., `gpt-3.5-turbo`)
   * `DEFAULT_PROVIDER` (`openai|huggingface|gemini`)
   * `DEMO_MODE` (`true|false`) — set to `false` in production
   * Client-side Vite variables (prefix with `VITE_`):

     * `VITE_DEFAULT_PROVIDER` (optional)
     * `VITE_FUNCTION_PATH` (optional — defaults to `/api/generate` on Vercel)
5. Deploy. The serverless function endpoint is `/api/generate`.

Notes:

* Vercel automatically treats `api/` files as serverless functions. We use a thin wrapper `api/generate.js` that calls `lib/aiClient.js`.

---

## Netlify deployment

1. Push to GitHub.
2. On Netlify, create a new site and connect the repo.
3. Build & deploy settings:

   * Build command: `npm run build`
   * Publish directory: `dist`
4. Add environment variables in Site settings (same set as Vercel). Important:

   * **Set `VITE_FUNCTION_PATH=/.netlify/functions/generate`** so the frontend points to Netlify function path.
   * Other variables: `OPENAI_API_KEY`, `HUGGINGFACE_API_KEY`, `GEMINI_API_KEY`, model names, `DEFAULT_PROVIDER`, `DEMO_MODE=false`.
5. Confirm `netlify/functions/generate.js` exists in the repo (it does).
6. Deploy and test.

Notes:

* Netlify serverless functions are mounted at `/.netlify/functions/<fn-name>` by default. Your frontend must use `VITE_FUNCTION_PATH` appropriately.

---

## Gemini (Google Generative Language) setup notes

Gemini is accessed via the Google Generative Language API (AI Studio / Vertex AI). For simple prototyping you can create an API key in AI Studio, but access levels and available models can vary by account.

**Steps (brief):**

1. Visit [https://studio.google.ai/](https://studio.google.ai/) and sign in with your Google account.
2. Look for **API Keys** or **Credentials** (UI changes over time). Create a new API key.
3. Add this key to your deployment env as `GEMINI_API_KEY`.
4. Use a model that your account can access — try `gemini-2.5-flash` or `gemini-1.5-flash`. If you get a 404 or permission error, try `gemini-2.5-flash` or check Google Cloud/Vertex AI console for access and billing.
5. If model access requires OAuth/service-account/Vertex-setup rather than an API key, follow Google docs to configure a service account and use server-side authentication accordingly.

**Important**: Gemini endpoints sometimes respond with different JSON shapes. `lib/aiClient.js` contains layered parsing and logging to help you inspect raw provider responses (the code logs Gemini body and status).

---

## Environment variables (quick reference)

Edit `.env` based on `.env.example`:

**Server-side (do NOT commit to git)**:

```
OPENAI_API_KEY=sk-...
HUGGINGFACE_API_KEY=hf-...
GEMINI_API_KEY=...
HF_MODEL=mistralai/Mistral-7B-Instruct-v0.3
GEMINI_MODEL=gemini-2.5-flash
OPENAI_MODEL=gpt-3.5-turbo
DEFAULT_PROVIDER=openai
DEMO_MODE=false
```

**Client-side (Vite — prefix with VITE_)**:

```
VITE_DEFAULT_PROVIDER=openai
VITE_FUNCTION_PATH=/api/generate            # Vercel default
# On Netlify, set VITE_FUNCTION_PATH=/.netlify/functions/generate
VITE_DEMO_MODE=false
```

---

## Logging & debugging tips

* **Server logs**: wrappers and `lib/aiClient.js` log provider status and raw response bodies. Use these logs to determine if the issue is:

  * a provider authentication error (401/403),
  * a model not found error (404),
  * a parse/truncation issue (model returned text but not JSON).
* **HTTP error shapes**:

  * `502` with `error: "PROVIDER_ERROR"` — provider-side problem (see `details`).
  * `502` with `error: "PARSE_ERROR"` — provider returned text that couldn't be parsed into JSON.
  * `500` with `error: "SERVER_ERROR"` — wrapper or server-side problem.

---

## Production recommendations

* **Protect your API keys** — use platform secrets (Vercel/Netlify env variables).
* **Set reasonable model & token limits** — `maxOutputTokens` is set centrally to `10000` but providers impose limits. If your model usage is costly, use a small model for initial calls or set `DEMO_MODE` for campaign previews.
* **Rate-limit & cache** — add caching for repeated job descriptions and limit calls per user to avoid cost spikes.
* **Monitor logs** — add alerts for provider failures and quota errors.

---

## Appendix: Useful commands

```bash
# local dev
cp .env.example .env
npm install
npm run start:api     # start local API at :5174
npm run dev           # start frontend at :5173

# smoke test
npm run test:smoke    # starts server in DEMO_MODE and validates JSON

# build for production
npm run build
```