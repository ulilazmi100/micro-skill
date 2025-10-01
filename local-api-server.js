// local-api-server.js (wrapper using lib/aiClient.js and prompts/prompts.js via require)
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const aiClient = require(path.join(process.cwd(), 'lib', 'aiClient.js'));

// require prompts synchronously
const prompts = require(path.join(process.cwd(), 'prompts', 'prompts.js'));
const buildUserPrompt = prompts.buildUserPrompt;
const buildExpansionPrompt = prompts.buildExpansionPrompt;
const buildHintPrompt = prompts.buildHintPrompt;

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.LOCAL_API_PORT || 5174;

app.post('/api/generate', async (req, res) => {
  try {
    const body = req.body || {};
    const action = body.action || 'generate';
    const { jobTitle = '', skillLevel = 'beginner', strengths = '', platform = '', jobDesc = '', provider: requestedProvider } = body;

    // Handle supplement fetches (expansion/hint)
    if (action === 'fetch_expansion' || action === 'fetch_hint') {
      // require lesson index and lesson object
      const lessonIndex = typeof body.lessonIndex !== 'undefined' ? Number(body.lessonIndex) : 0;
      const lesson = body.lesson || {};
      // If demo mode, return supplement from demo fixture
      if (String(process.env.DEMO_MODE).toLowerCase() === 'true') {
        try {
          const sup = aiClient.getDemoSupplement({ type: action === 'fetch_expansion' ? 'expansion' : 'hint', index: lessonIndex });
          return res.status(200).json({ supplement: sup });
        } catch (err) {
          console.error('local-api-server demo supplement error', err);
          return res.status(500).json({ error: 'SERVER_ERROR', message: String(err) });
        }
      }

      // Non-demo: build prompt and call provider for plain text
      try {
        const userPrompt = action === 'fetch_expansion'
          ? buildExpansionPrompt({ jobTitle, skillLevel, strengths, platform, jobDesc, lesson })
          : buildHintPrompt({ jobTitle, skillLevel, strengths, platform, jobDesc, lesson });

        console.log('local-api-server: fetching supplement provider=', requestedProvider || process.env.DEFAULT_PROVIDER || 'openai', 'action=', action);
        const systemPrompt = prompts.SYSTEM_PROMPT;
        const { assistantText } = await aiClient.generatePlainText({ provider: requestedProvider, systemPrompt, userPrompt, extra: { maxOutputTokens: 1500 } });
        return res.status(200).json({ supplement: assistantText });
      } catch (err) {
        console.error('local-api-server: supplement provider error', err);
        if (err && err.source === 'provider') return res.status(502).json({ error: err.code || 'PROVIDER_ERROR', provider: err.provider, message: err.message, details: err.details });
        return res.status(500).json({ error: err.code || 'SERVER_ERROR', message: err.message || String(err), details: err.details || null });
      }
    }

    // Default generation flow
    if (!jobDesc) return res.status(400).json({ error: 'MISSING: jobDesc' });

    const userPrompt = buildUserPrompt({ jobTitle, skillLevel, strengths, platform, jobDesc });

    console.log('local-api-server: calling AI client provider=', requestedProvider || process.env.DEFAULT_PROVIDER || 'openai');

    try {
      const result = await aiClient.generateForProvider({ provider: requestedProvider, userPrompt, extra: { maxOutputTokens: 10000 } });
      return res.status(200).json(result.parsed);
    } catch (err) {
      console.error('local-api-server: AI error', err);
      if (err && err.source === 'provider') return res.status(502).json({ error: err.code || 'PROVIDER_ERROR', provider: err.provider, message: err.message, details: err.details });
      return res.status(500).json({ error: err.code || 'SERVER_ERROR', message: err.message || String(err), details: err.details || null });
    }
  } catch (err) {
    console.error('local-api-server unexpected', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Local API server listening at http://localhost:${PORT}/api/generate`);
});
