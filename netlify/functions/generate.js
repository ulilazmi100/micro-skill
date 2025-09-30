// netlify/functions/generate.js (Netlify wrapper - thin adapter)
const path = require('path');
const aiClient = require(path.join(process.cwd(), 'lib', 'aiClient.js'));
const { pathToFileURL } = require('url');

async function loadPrompts() {
  const p = path.join(process.cwd(), 'prompts', 'prompts.js');
  return import(pathToFileURL(p).href);
}

exports.handler = async function (event) {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }
    const { jobTitle = '', skillLevel = 'beginner', strengths = '', platform = '', jobDesc = '', provider: requestedProvider } = body;
    if (!jobDesc) return { statusCode: 400, body: JSON.stringify({ error: 'MISSING: jobDesc' }) };

    const prompts = await loadPrompts();
    const userPrompt = prompts.buildUserPrompt({ jobTitle, skillLevel, strengths, platform, jobDesc });

    console.log('netlify function: calling AI client provider=', requestedProvider || process.env.DEFAULT_PROVIDER || 'openai');

    try {
      const result = await aiClient.generateForProvider({ provider: requestedProvider, userPrompt, extra: { maxOutputTokens: 10000 } });
      return { statusCode: 200, body: JSON.stringify(result.parsed) };
    } catch (err) {
      console.error('netlify function provider error', err);
      if (err && err.source === 'provider') return { statusCode: 502, body: JSON.stringify({ error: err.code || 'PROVIDER_ERROR', provider: err.provider, message: err.message, details: err.details }) };
      return { statusCode: 500, body: JSON.stringify({ error: err.code || 'SERVER_ERROR', message: err.message || String(err), details: err.details || null }) };
    }
  } catch (err) {
    console.error('netlify function unexpected', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'SERVER_ERROR', message: String(err) }) };
  }
};
