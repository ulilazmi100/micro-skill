// api/generate.js (Vercel wrapper - thin adapter)
const path = require('path');
const aiClient = require(path.join(process.cwd(), 'lib', 'aiClient.js'));
const { pathToFileURL } = require('url');

async function loadPrompts() {
  const p = path.join(process.cwd(), 'prompts', 'prompts.js');
  return import(pathToFileURL(p).href);
}

module.exports = async function (req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const body = req.body || {};
    const { jobTitle = '', skillLevel = 'beginner', strengths = '', platform = '', jobDesc = '', provider: requestedProvider } = body;
    if (!jobDesc) return res.status(400).json({ error: 'MISSING: jobDesc' });

    // load prompts module
    const prompts = await loadPrompts();
    const buildUserPrompt = prompts.buildUserPrompt;

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
