# Deployment & Gemini Setup Guide (MicroSkill)

This file contains step-by-step deployment instructions for Vercel and Netlify, and how to obtain and configure Gemini (Google) API keys.

## Local quick test (safe)
1. Copy files, then:
   ```
   cp .env.example .env
   ```
2. Edit `.env` and set:
   - `DEMO_MODE=true`
3. Install and run:
   ```
   npm install
   npm run dev
   ```
4. Open `http://localhost:5173` — demo mode uses canned responses and no external API calls.

## Vercel deployment (recommended)
1. Push the project to GitHub.
2. Go to https://vercel.com and import the repo.
3. In Project Settings → Environment Variables, add the following secrets (only set the ones you plan to use):
   - OPENAI_API_KEY
   - HUGGINGFACE_API_KEY
   - GEMINI_API_KEY
   - HF_MODEL (e.g., mistralai/Mistral-7B-Instruct-v0.3)
   - GEMINI_MODEL (e.g., gemini-1.5-flash)
   - OPENAI_MODEL (e.g., gpt-3.5-turbo)
   - DEFAULT_PROVIDER (openai | huggingface | gemini)
   - DEMO_MODE (true | false)
   - VITE_DEFAULT_PROVIDER (openai | huggingface | gemini)
   - VITE_FUNCTION_PATH (optional, defaults to /api/generate)
4. Deploy. Functions are available at `/api/generate`.

## Netlify deployment
1. Push the project to GitHub.
2. In Netlify, create a new site from GitHub.
3. Set Site → Build & deploy → Environment:
   - OPENAI_API_KEY, HUGGINGFACE_API_KEY, GEMINI_API_KEY
   - HF_MODEL, GEMINI_MODEL, OPENAI_MODEL
   - DEFAULT_PROVIDER, DEMO_MODE
   - IMPORTANT: set `VITE_FUNCTION_PATH=/.netlify/functions/generate`
4. Ensure `netlify/functions/generate.js` exists (it does in this repo).
5. Set build command: `npm run build` and publish directory: `dist`.
6. Deploy and test.

## Obtaining Gemini API Key (Google AI Studio)
Google provides the Gemini (Generative Language) API via Google AI Studio and Vertex AI. For a simple prototype you can create an API key in AI Studio:

1. Go to https://studio.google.ai/ → Sign in.
2. Navigate to **API Keys** or **Settings** (UI may change). Create a new API key.
3. Copy the key and add it to your hosting platform as `GEMINI_API_KEY`.
4. In some cases you may need to enable billing or request access to certain models (e.g., gemini-2.5). Start with `gemini-1.5-flash` which is commonly available.
5. For production use, follow Google docs for Vertex AI and service account authentication.

## Notes & troubleshooting
- If a provider is gated or rate-limited, set `DEMO_MODE=true` for the demo video.
- Monitor logs in Vercel/Netlify if parsing errors occur. Adjust SYSTEM_PROMPT or lower temperature.
- Never commit your API keys to git.

