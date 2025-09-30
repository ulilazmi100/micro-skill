// local-api-server.js (wrapper using lib/aiClient.js and prompts/prompts.js via require)
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const aiClient = require(path.join(process.cwd(), 'lib', 'aiClient.js'));

// require prompts synchronously
const prompts = require(path.join(process.cwd(), 'prompts', 'prompts.js'));
const buildUserPrompt = prompts.buildUserPrompt;

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.LOCAL_API_PORT || 5174;

app.post('/api/generate', async (req, res) => {
  try {
    const { jobTitle = '', skillLevel = 'beginner', strengths = '', platform = '', jobDesc = '', provider: requestedProvider } = req.body || {};
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
