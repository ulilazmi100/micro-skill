// api/generate.js (Vercel wrapper - thin adapter, uses CommonJS require for prompts)
const path = require('path');
const aiClient = require(path.join(process.cwd(), 'lib', 'aiClient.js'));

// Load prompts synchronously (CommonJS)
const prompts = require(path.join(process.cwd(), 'prompts', 'prompts.js'));
const buildUserPrompt = prompts.buildUserPrompt;

module.exports = async function (req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body = req.body || {};
    const { jobTitle = '', skillLevel = 'beginner', strengths = '', platform = '', jobDesc = '', provider: requestedProvider } = body;

    if (!jobDesc) return res.status(400).json({ error: 'MISSING: jobDesc' });

    const userPrompt = buildUserPrompt({ jobTitle, skillLevel, strengths, platform, jobDesc });

    console.log('api/generate.js: calling AI client provider=', requestedProvider || process.env.DEFAULT_PROVIDER || 'openai');

    try {
      const result = await aiClient.generateForProvider({ provider: requestedProvider, userPrompt, extra: { maxOutputTokens: 10000 } });
      return res.status(200).json(result.parsed);
    } catch (err) {
      console.error('api/generate.js: AI error', err);
      if (err && err.source === 'provider') return res.status(502).json({ error: err.code || 'PROVIDER_ERROR', provider: err.provider, message: err.message, details: err.details });
      return res.status(500).json({ error: err.code || 'SERVER_ERROR', message: err.message || String(err), details: err.details || null });
    }
  } catch (err) {
    console.error('api/generate.js unexpected', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: String(err) });
  }
};
