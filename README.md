# MicroSkill — 1-Minute MicroMentor

Lightweight PWA-style single-page app that generates 5 micro-lessons, two profile blurbs, and a concise cover message for a pasted gig/job description. Built with React + Vite and a serverless API that proxies calls to OpenAI, Hugging Face, or Gemini (Google).

## Quick start (local)
1. Copy the repository files locally.
2. `cp .env.example .env`
3. Add your API keys to `.env` (or use DEMO_MODE=true).
4. `npm install`
5. `npm run dev`
6. Open `http://localhost:5173`

## Deploy
Recommended: **Vercel** or **Netlify**. See README_DEPLOY.md for full deploy instructions including Gemini setup.

## License
MIT
