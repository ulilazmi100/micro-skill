/* Netlify function: netlify/functions/generate.js
   Supports openai | huggingface | gemini
*/
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const {
    jobTitle = '',
    skillLevel = 'beginner',
    strengths = '',
    platform = '',
    jobDesc = '',
    provider: requestedProvider
  } = body;

  const provider = (requestedProvider || process.env.DEFAULT_PROVIDER || 'openai').toLowerCase();
  if (!jobDesc) return { statusCode: 400, body: JSON.stringify({ error: 'Missing jobDesc' }) };

  if (process.env.DEMO_MODE === 'true') {
    return {
      statusCode: 200,
      body: JSON.stringify({
        micro_lessons: [
          { title: 'Reproduce fast', tip: 'Reproduce the bug and isolate the file.', practice_task: 'Reproduce a button not working in 10 minutes.', example_output: 'Button responds' },
          { title: 'Add a test', tip: 'Create a simple failing test capturing the bug.', practice_task: 'Add one test for failing behavior.', example_output: 'Test fails then passes' },
          { title: 'Small fix', tip: 'Make the minimal change and run existing tests.', practice_task: 'Fix the single failing line.', example_output: 'All tests green' },
          { title: 'Document', tip: 'Add a short PR description and a demo GIF.', practice_task: 'Record a 20s demo GIF.', example_output: 'GIF shows fix' },
          { title: 'Ask clarifying Q', tip: 'End with one question to define scope.', practice_task: 'Write 1 clarifying question.', example_output: 'Do you have a link?' }
        ],
        profile_short: 'Fast frontend dev — reliable fixes & fast delivery.',
        profile_long: 'Front-end developer with fast turnarounds and clear demos. I deliver reliable fixes and solid tests.',
        cover_message: 'Hi — I can fix your UI bug quickly with tests and a short demo. I’ll reproduce the issue, implement a minimal fix, and send a 20s demo. Can you share the repo or a reproduction link?'
      })
    };
  }

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
{ "micro_lessons": [...], "profile_short":"", "profile_long":"", "cover_message":"" }
Constraints recap: lesson tip ≤45 words; practice_task 8–12 words; example_output ≤8 words; cover_message 35–55 words.
Tone: friendly, confident, action-focused. No fluff. Use active verbs.`;
  }

  function tryParseJSON(text) {
    if (!text || typeof text !== 'string') return null;
    try { return JSON.parse(text); } catch (e) {
      const codeBlock = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```([\s\S]*?)```/i);
      if (codeBlock) {
        try { return JSON.parse(codeBlock[1]); } catch (e2) {}
      }
      const first = text.indexOf('{'), last = text.lastIndexOf('}');
      if (first !== -1 && last !== -1 && last > first) {
        const candidate = text.slice(first, last + 1);
        try { return JSON.parse(candidate); } catch (e3) {}
      }
      return null;
    }
  }

  const userPrompt = buildUserPrompt({ jobTitle, skillLevel, strengths, platform, jobDesc });

  try {
    if (provider === 'openai') {
      const OPENAI_KEY = process.env.OPENAI_API_KEY;
      if (!OPENAI_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'OpenAI API key not configured' }) };

      const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }], temperature: 0.25, max_tokens: 700 })
      });

      if (!resp.ok) {
        const txt = await resp.text();
        console.error('OpenAI error', resp.status, txt);
        return { statusCode: 500, body: JSON.stringify({ error: 'OpenAI API error', details: txt }) };
      }
      const data = await resp.json();
      const assistantText = data.choices?.[0]?.message?.content || '';
      const parsed = tryParseJSON(assistantText);
      if (parsed) return { statusCode: 200, body: JSON.stringify(parsed) };
      return { statusCode: 200, body: JSON.stringify({ error: 'Failed to parse model JSON', raw: assistantText }) };
    }

    if (provider === 'huggingface') {
      const HF_KEY = process.env.HUGGINGFACE_API_KEY;
      const HF_MODEL = process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';
      if (!HF_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'Hugging Face API key not configured' }) };

      const hfInput = `${SYSTEM_PROMPT}\n\n${userPrompt}`;
      const hfResp = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${HF_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: hfInput, parameters: { max_new_tokens: 700, temperature: 0.25 } })
      });

      if (!hfResp.ok) {
        const txt = await hfResp.text();
        console.error('HuggingFace error', hfResp.status, txt);
        return { statusCode: 500, body: JSON.stringify({ error: 'HuggingFace API error', details: txt }) };
      }

      const hfData = await hfResp.json();
      let assistantText = '';
      if (Array.isArray(hfData) && hfData[0]?.generated_text) assistantText = hfData[0].generated_text;
      else if (hfData.generated_text) assistantText = hfData.generated_text;
      else assistantText = typeof hfData === 'string' ? hfData : JSON.stringify(hfData);

      const parsed = tryParseJSON(assistantText);
      if (parsed) return { statusCode: 200, body: JSON.stringify(parsed) };
      return { statusCode: 200, body: JSON.stringify({ error: 'Failed to parse model JSON', raw: assistantText }) };
    }

    if (provider === 'gemini') {
      const GEMINI_KEY = process.env.GEMINI_API_KEY;
      const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
      if (!GEMINI_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'Gemini API key not configured as GEMINI_API_KEY' }) };

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generate`;
      const payload = { prompt: { text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }, maxOutputTokens: 700, temperature: 0.25 };

      const gemResp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
        body: JSON.stringify(payload)
      });

      if (!gemResp.ok) {
        const txt = await gemResp.text();
        console.error('Gemini API error', gemResp.status, txt);
        return { statusCode: 500, body: JSON.stringify({ error: 'Gemini API error', details: txt }) };
      }

      const gemData = await gemResp.json();
      let assistantText = '';
      if (gemData?.candidates && Array.isArray(gemData.candidates) && gemData.candidates[0]?.content) {
        const c = gemData.candidates[0].content;
        if (typeof c === 'string') assistantText = c;
        else if (Array.isArray(c)) assistantText = c.map(p => p?.text || '').join('');
      } else if (gemData?.output?.length) {
        assistantText = gemData.output.map(o => (o?.content || []).map(p => p?.text || '').join('')).join('');
      } else if (gemData?.responseText) {
        assistantText = gemData.responseText;
      } else {
        assistantText = JSON.stringify(gemData);
      }

      const parsed = tryParseJSON(assistantText);
      if (parsed) return { statusCode: 200, body: JSON.stringify(parsed) };
      return { statusCode: 200, body: JSON.stringify({ error: 'Failed to parse model JSON', raw: assistantText }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Unsupported provider' }) };
  } catch (err) {
    console.error('Server error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error', details: String(err) }) };
  }
};
