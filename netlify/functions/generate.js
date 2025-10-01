// netlify/functions/generate.js (Netlify wrapper - requires prompts CommonJS)
const path = require('path');
const aiClient = require(path.join(process.cwd(), 'lib', 'aiClient.js'));

// sync require prompts
const prompts = require(path.join(process.cwd(), 'prompts', 'prompts.js'));
const buildUserPrompt = prompts.buildUserPrompt;
const buildExpansionPrompt = prompts.buildExpansionPrompt;
const buildHintPrompt = prompts.buildHintPrompt;

exports.handler = async function (event) {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }

    const action = body.action || 'generate';
    const { jobTitle = '', skillLevel = 'beginner', strengths = '', platform = '', jobDesc = '', provider: requestedProvider } = body;

    if (action === 'fetch_expansion' || action === 'fetch_hint') {
      const lessonIndex = typeof body.lessonIndex !== 'undefined' ? Number(body.lessonIndex) : 0;
      const lesson = body.lesson || {};

      if (String(process.env.DEMO_MODE).toLowerCase() === 'true') {
        try {
          const sup = aiClient.getDemoSupplement({ type: action === 'fetch_expansion' ? 'expansion' : 'hint', index: lessonIndex });
          return { statusCode: 200, body: JSON.stringify({ supplement: sup }) };
        } catch (err) {
          console.error('netlify function demo supplement error', err);
          return { statusCode: 500, body: JSON.stringify({ error: 'SERVER_ERROR', message: String(err) }) };
        }
      }

      try {
        const userPrompt = action === 'fetch_expansion'
          ? buildExpansionPrompt({ jobTitle, skillLevel, strengths, platform, jobDesc, lesson })
          : buildHintPrompt({ jobTitle, skillLevel, strengths, platform, jobDesc, lesson });

        console.log('netlify function: fetching supplement provider=', requestedProvider || process.env.DEFAULT_PROVIDER || 'openai', 'action=', action);
        const systemPrompt = prompts.SYSTEM_PROMPT;
        const { assistantText } = await aiClient.generatePlainText({ provider: requestedProvider, systemPrompt, userPrompt, extra: { maxOutputTokens: 1500 } });
        return { statusCode: 200, body: JSON.stringify({ supplement: assistantText }) };
      } catch (err) {
        console.error('netlify function provider error', err);
        if (err && err.source === 'provider') return { statusCode: 502, body: JSON.stringify({ error: err.code || 'PROVIDER_ERROR', provider: err.provider, message: err.message, details: err.details }) };
        return { statusCode: 500, body: JSON.stringify({ error: err.code || 'SERVER_ERROR', message: err.message || String(err), details: err.details || null }) };
      }
    }

    // Default generate flow
    const { jobTitle: jt = '', skillLevel: sl = 'beginner', strengths: st = '', platform: pf = '', jobDesc: jd = '' } = body;
    if (!jd) return { statusCode: 400, body: JSON.stringify({ error: 'MISSING: jobDesc' }) };

    const userPrompt = buildUserPrompt({ jobTitle: jt, skillLevel: sl, strengths: st, platform: pf, jobDesc: jd });

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
