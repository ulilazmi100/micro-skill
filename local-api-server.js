// local-api-server.js
// Local Express server to emulate the same behavior as the serverless functions.
// Usage: node local-api-server.js
//
// Environment variables used (same as serverless):
// - DEMO_MODE (true|false)
// - DEFAULT_PROVIDER
// - OPENAI_API_KEY, OPENAI_MODEL
// - HUGGINGFACE_API_KEY, HF_MODEL
// - GEMINI_API_KEY, GEMINI_MODEL
//
// Note: Node 18+ recommended for global fetch. If not available, install node-fetch and adapt.

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.LOCAL_API_PORT || 5174;

const SYSTEM_PROMPT = `You are MicroSkill, a concise and practical micro-mentor. Your job: produce short, high-utility outputs for busy gig workers. Be direct, practical, and optimism-focused. Always follow the user's instructions and strict output constraints below.
Important rules:
- Keep micro-lessons short: each lesson must be ≤ 45 words.
- Each micro-lesson must include: 1) a 1–2 sentence tip, 2) a single 8–12 word practice task, 3) a 1–8 word example output.
- Produce exactly 5 micro-lessons unless the user asks otherwise.
- Provide two profile blurbs: short (1 sentence ≤ 20 words) and long (2 sentences ≤ 40 words).
- Provide exactly one cover message: 35–55 words, tailored to the pasted job description.
- Return output in clean JSON with keys: micro_lessons (array), profile_short, profile_long, cover_message.
- Avoid medical or legal advice. If the request requires a licensed professional, respond: "I can't advise on that — consult a qualified professional."
- If missing required info, return JSON: { "error": "MISSING: [what]" }`;

function buildUserPrompt({ jobTitle, skillLevel, strengths, platform, jobDesc }) {
  return `GEN: Micro-lessons + Profile + Cover
JOB_TITLE: ${jobTitle}
SKILL_LEVEL: ${skillLevel}
STRENGTHS: ${strengths}
PLATFORM: ${platform}
JOB_DESCRIPTION: ${jobDesc}
LANGUAGE: English

Produce output in JSON with fields:
{
  "micro_lessons": [
    {"title":"", "tip":"", "practice_task":"", "example_output":""},
    ... (exactly 5)
  ],
  "profile_short":"",
  "profile_long":"",
  "cover_message":"",
}

Constraints recap: lesson tip ≤45 words; practice_task 8–12 words; example_output ≤8 words; cover_message 35–55 words.
Tone: friendly, confident, action-focused. No fluff. Use active verbs.`;
}

function tryParseJSON(text) {
  if (!text || typeof text !== 'string') return null;
  try { return JSON.parse(text); } catch (e) {}
  const codeBlock = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```([\s\S]*?)```/i);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1]); } catch (e) {}
  }
  const first = text.indexOf('{'), last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    const candidate = text.slice(first, last + 1);
    try { return JSON.parse(candidate); } catch (e) {}
  }
  return null;
}

function stripCodeFences(s) {
  if (!s || typeof s !== 'string') return s;
  return s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// provider implementations (same logic as serverless)
async function callOpenAI(systemPrompt, userPrompt) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) throw new Error('OpenAI API key not configured');
  const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  const url = 'https://api.openai.com/v1/chat/completions';
  const payload = {
    model,
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    temperature: 0.25,
    max_tokens: 10000
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify(payload)
  });

  const txt = await resp.text();
  if (!resp.ok) throw new Error(`OpenAI API error: ${resp.status} ${txt}`);
  const data = JSON.parse(txt);
  return data?.choices?.[0]?.message?.content || '';
}

async function callHuggingFace(systemPrompt, userPrompt) {
  const HF_KEY = process.env.HUGGINGFACE_API_KEY;
  const HF_MODEL = process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';
  if (!HF_KEY) throw new Error('Hugging Face API key not configured');

  const hfInput = `${systemPrompt}\n\n${userPrompt}`;
  const url = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

  const maxRetries = 3;
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${HF_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: hfInput, parameters: { max_new_tokens: 10000, temperature: 0.25 } })
    });
    const text = await r.text();
    if (r.ok) {
      try {
        const j = JSON.parse(text);
        if (Array.isArray(j) && j[0]?.generated_text) return j[0].generated_text;
        if (j?.generated_text) return j.generated_text;
        return text;
      } catch (e) {
        return text;
      }
    } else {
      if (r.status >= 500 && r.status < 600 && attempt < maxRetries) {
        await sleep(500 * Math.pow(2, attempt - 1));
        continue;
      }
      throw new Error(`HuggingFace API error: ${r.status} ${text}`);
    }
  }
  throw new Error('HuggingFace retries exhausted');
}

async function callGemini(systemPrompt, userPrompt) {
  const rawKey = process.env.GEMINI_API_KEY || '';
  const GEMINI_KEY = rawKey.trim();
  const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!GEMINI_KEY) throw new Error('Gemini API key not configured');

  const endpointBase = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
  const payload = {
    contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
    generationConfig: { temperature: 0.25, maxOutputTokens: 10000, candidateCount: 1 }
  };

  async function doRequest(useQueryKey = false) {
    const url = useQueryKey ? `${endpointBase}?key=${encodeURIComponent(GEMINI_KEY)}` : endpointBase;
    const headers = { 'Content-Type': 'application/json' };
    if (!useQueryKey) headers['x-goog-api-key'] = GEMINI_KEY;
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    const text = await r.text();
    return { status: r.status, text };
  }

  const maxAttempts = 3;
  let attempt = 0;
  let lastResp = null;
  while (attempt < maxAttempts) {
    attempt++;
    let resp = await doRequest(false);
    console.log(`Gemini header attempt ${attempt} status=${resp.status}`);
    console.log('Gemini body (header):', resp.text);

    if ([401, 403, 404].includes(resp.status)) {
      resp = await doRequest(true);
      console.log(`Gemini fallback attempt ${attempt} status=${resp.status}`);
      console.log('Gemini body (fallback):', resp.text);
    }

    lastResp = resp;
    if (resp.status >= 200 && resp.status < 300) {
      let gemData = null;
      try { gemData = JSON.parse(resp.text); } catch (e) { gemData = null; }

      let assistantText = '';
      if (gemData?.candidates && gemData.candidates[0]?.content?.parts) {
        assistantText = gemData.candidates[0].content.parts.map(p => p?.text || '').join('');
      } else if (gemData?.responseText) {
        assistantText = gemData.responseText;
      } else {
        assistantText = resp.text;
      }

      assistantText = stripCodeFences(assistantText);
      return assistantText;
    }

    if (resp.status >= 500 && resp.status < 600 && attempt < maxAttempts) {
      await sleep(500 * Math.pow(2, attempt - 1));
      continue;
    }

    break;
  }

  const details = lastResp ? lastResp.text : 'No response';
  throw new Error(`Gemini API error: status=${lastResp?.status || 'unknown'} body=${details}`);
}

app.post('/api/generate', async (req, res) => {
  try {
    const {
      jobTitle = '',
      skillLevel = 'beginner',
      strengths = '',
      platform = '',
      jobDesc = '',
      provider: requestedProvider
    } = req.body || {};

    const provider = (requestedProvider || process.env.DEFAULT_PROVIDER || 'openai').toLowerCase();

    if (!jobDesc) return res.status(400).json({ error: 'Missing jobDesc' });

    if (process.env.DEMO_MODE === 'true') {
      return res.json({
        micro_lessons: [
          { title: 'Reproduce fast', tip: 'Reproduce the bug and isolate the file.', practice_task: 'Reproduce a button not working in 10 minutes.', example_output: 'Button responds' },
          { title: 'Add a test', tip: 'Create a simple failing test capturing the bug.', practice_task: 'Add one test for failing behavior.', example_output: 'Test fails then passes' },
          { title: 'Small fix', tip: 'Make the minimal change and run existing tests.', practice_task: 'Fix the single failing line.', example_output: 'All tests green' },
          { title: 'Document', tip: 'Add a short PR description and a demo GIF.', practice_task: 'Record a 20s demo GIF.', example_output: 'GIF shows fix' },
          { title: 'Ask clarifying Q', tip: 'End with one question to define scope.', practice_task: 'Write 1 clarifying question.', example_output: 'Do you have a link?' }
        ],
        profile_short: 'Fast frontend dev — reliable fixes & fast delivery.',
        profile_long: 'Front-end developer with fast turnarounds and clear demos. I deliver reliable fixes and solid tests.',
        cover_message: 'Hi — I can fix your UI bug quickly with tests and a short demo.'
      });
    }

    const userPrompt = buildUserPrompt({ jobTitle, skillLevel, strengths, platform, jobDesc });

    let assistantText = '';
    if (provider === 'openai') {
      assistantText = await callOpenAI(SYSTEM_PROMPT, userPrompt);
    } else if (provider === 'huggingface') {
      assistantText = await callHuggingFace(SYSTEM_PROMPT, userPrompt);
    } else if (provider === 'gemini') {
      assistantText = await callGemini(SYSTEM_PROMPT, userPrompt);
    } else {
      return res.status(400).json({ error: 'Unsupported provider' });
    }

    const cleaned = stripCodeFences(assistantText);
    const parsed = tryParseJSON(cleaned);
    if (parsed) return res.json(parsed);
    // Return raw for debugging if parse failed
    return res.json({ error: 'Failed to parse model JSON', raw: cleaned });
  } catch (err) {
    console.error('local-api error', err);
    return res.status(500).json({ error: 'Server error', details: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Local API server listening at http://localhost:${PORT}/api/generate`);
});
