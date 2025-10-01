// lib/aiClient.js
// Shared AI client (CommonJS).
// Exports generateForProvider and helpers, and also generatePlainText + getDemoSupplement.

const path = require('path');

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const DEFAULT_HF_MODEL = process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

// Load prompts (CommonJS require) from prompts/prompts.js (single source-of-truth)
function loadPromptsModuleSync() {
  const promptsPath = path.join(process.cwd(), 'prompts', 'prompts.js');
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const mod = require(promptsPath);
  return mod;
}

// ------------------------
// DEMO fixture (single source)
// ------------------------
const DEMO_FIXTURE = {
  micro_lessons: [
    {
      title: 'Reproduce quickly',
      difficulty: 'Beginner',
      tip: 'Reproduce the issue locally using a minimal test or reproduction steps; keep it under 10 minutes.',
      hints: ['Start by checking console logs and network requests; take a screenshot.'],
      practice_task: 'Create a minimal reproduction case demonstrating the bug in one file.',
      example_output: 'Reproduction steps documented',
      full_guide: `### Reproduce quickly

Objective — What you'll accomplish: Reproduce the failing UI behavior quickly and reliably. Focus on isolating the smallest case that shows the issue.

Why it matters: Quickly reproducing the problem helps you reason about root cause and creates a concrete test to validate fixes.

Steps:
1) Open the app and reproduce the flow until the bug appears. Note exact steps.
2) Check browser console and network panel for errors and failing requests.
3) Copy the component/page into a single new file and remove unrelated code.
4) Reduce inputs and props until the failure still occurs; this identifies the minimal surface area.
5) Save screenshots, console logs, and the minimal reproduction.

Pro tip: Keep the reproduction as tiny as possible; it makes debugging and sharing faster.

Practice routine:
- Repeat 1 (5–10 minutes): Reproduce the bug and record steps.
- Repeat 2 (5–10 minutes): Reduce the repro to the smallest file possible.
- Repeat 3 (3–5 minutes): Save artifacts and prepare notes.

Time estimate: 10–20 minutes.

Example output:
- Short reproduction steps and console logs.`
    },
    {
      title: 'Write a failing test',
      difficulty: 'Intermediate',
      tip: 'Capture the bug with a simple automated test so your fix is verifiable and prevents regressions.',
      hints: ['If using Jest, mock external dependencies and assert DOM behavior.'],
      practice_task: 'Write a single unit or integration test that fails on the bug scenario.',
      example_output: 'Test fails on bug',
      full_guide: `### Write a failing test

Objective — Create a focused failing test that reproduces the bug and prevents regressions.

Why it matters: A failing test documents the bug and keeps future changes from reintroducing it.

Steps:
1) Identify the function or component the bug touches.
2) Set up the test environment and mock network or time-dependent parts.
3) Write one assertion that fails because of the bug.
4) Run the test to confirm it fails reliably.
5) Commit the failing test before you implement the fix.

Pro tip: Keep the test small and deterministic—avoid flakiness.

Practice routine:
- Repeat 1 (10 minutes): Write the minimal test.
- Repeat 2 (10 minutes): Refactor mocks and ensure determinism.
- Repeat 3 (5 minutes): Commit and document the test.

Time estimate: 15–30 minutes.

Example output:
- A single failing unit/integration test.`
    },
    {
      title: 'Implement a minimal fix',
      difficulty: 'Beginner',
      tip: 'Make the smallest change that fixes the test and keep changes focused to one area.',
      hints: ['Prefer a hotfix that is easy to revert if it introduces regressions.'],
      practice_task: 'Modify a single function or component to make the test pass.',
      example_output: 'All tests pass',
      full_guide: `### Implement a minimal fix

Objective — Apply a single, focused change to make the failing test pass.

Why it matters: Small fixes are easier to review and less likely to introduce regressions.

Steps:
1) Locate the smallest unit responsible for the failing assertion.
2) Apply the minimal code change needed.
3) Run the test suite and ensure only the target test changes.
4) Add a brief comment or changelog entry describing the fix.
5) Push and request a quick PR review.

Pro tip: Avoid large refactors in the hotfix—keep the change atomic.

Practice routine:
- Repeat 1 (10 minutes): Implement the minimal change and run tests.
- Repeat 2 (10 minutes): Add a brief comment and re-run.
- Repeat 3 (5 minutes): Prepare a PR description.

Time estimate: 10–30 minutes.

Example output:
- All tests pass and a short PR description.`
    },
    {
      title: 'Run full suite & lint',
      difficulty: 'Experienced',
      tip: 'Run the full test suite and linter to avoid introducing regressions or style/syntax issues.',
      hints: ['If CI fails, open the failure logs and address the first error; often unrelated tests break due to flakiness.'],
      practice_task: 'Run project tests and fix any incidental failures or linter warnings.',
      example_output: 'Tests green, lint clean',
      full_guide: `### Run full suite & lint

Objective — Ensure your change does not break the wider codebase by running all tests and linting.

Why it matters: Prevents regressions and maintains code quality.

Steps:
1) Run the full test suite locally.
2) Fix incidental failures that surface after your change.
3) Run linter and address warnings or style issues.
4) Re-run tests and commit fixes.

Pro tip: If CI shows unrelated failures, address the earliest failure first.

Practice routine:
- Repeat 1 (15–30 minutes): Run full suite and fix failures.
- Repeat 2 (15 minutes): Run linter and apply fixes.
- Repeat 3 (5–10 minutes): Re-run tests and finalize.

Time estimate: 15–60 minutes.

Example output:
- CI green and linter clean.`
    }
  ],
  profile_short: 'Quick-fix frontend engineer focused on reproducible, tested bug fixes.',
  profile_long: 'I rapidly reproduce bugs, add minimal tests, and implement targeted fixes with clear demos. I prioritize small, verifiable changes and fast delivery.',
  cover_message: 'Hi — I can reproduce and fix this issue quickly. I will create a minimal reproduction, add a failing test, implement a small fix, run the full test suite, and send a short demo and PR description. Can you share the repo or a reproduction link?'
};

// Utilities
function stripCodeFences(s) {
  if (!s || typeof s !== 'string') return s;
  return s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Provider implementations
async function callOpenAI(systemPrompt, userPrompt, opts = {}) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) throw { source: 'provider', provider: 'openai', code: 'MISSING_API_KEY', message: 'OpenAI API key not configured (OPENAI_API_KEY)' };
  const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  const url = 'https://api.openai.com/v1/chat/completions';
  const payload = {
    model,
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    temperature: 0.25,
    max_tokens: opts.max_tokens || 7000
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify(payload)
  });

  const txt = await resp.text();
  if (!resp.ok) {
    throw { source: 'provider', provider: 'openai', code: 'PROVIDER_ERROR', status: resp.status, message: 'OpenAI API error', details: txt };
  }
  let data;
  try { data = JSON.parse(txt); } catch (e) {
    throw { source: 'provider', provider: 'openai', code: 'INVALID_RESPONSE', message: 'OpenAI returned non-JSON', details: txt };
  }
  const assistantText = data?.choices?.[0]?.message?.content || '';
  return { assistantText, rawResponse: txt };
}

async function callHuggingFace(systemPrompt, userPrompt, opts = {}) {
  const HF_KEY = process.env.HUGGINGFACE_API_KEY;
  const HF_MODEL = process.env.HF_MODEL || DEFAULT_HF_MODEL;
  if (!HF_KEY) throw { source: 'provider', provider: 'huggingface', code: 'MISSING_API_KEY', message: 'Hugging Face API key not configured' };

  const hfInput = `${systemPrompt}\n\n${userPrompt}`;
  const url = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
  const maxRetries = 3;
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${HF_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: hfInput, parameters: { max_new_tokens: opts.hf_max_new_tokens || 7000, temperature: 0.25 } })
    });
    const text = await r.text();
    if (r.ok) {
      try {
        const j = JSON.parse(text);
        if (Array.isArray(j) && j[0]?.generated_text) return { assistantText: j[0].generated_text, rawResponse: text };
        if (j?.generated_text) return { assistantText: j.generated_text, rawResponse: text };
        return { assistantText: text, rawResponse: text };
      } catch (e) {
        return { assistantText: text, rawResponse: text };
      }
    } else {
      if (r.status >= 500 && attempt < maxRetries) {
        await sleep(500 * Math.pow(2, attempt - 1));
        continue;
      }
      throw { source: 'provider', provider: 'huggingface', code: 'PROVIDER_ERROR', status: r.status, message: 'HuggingFace API error', details: text };
    }
  }
  throw { source: 'provider', provider: 'huggingface', code: 'RETRIES_EXHAUSTED', message: 'HuggingFace retries exhausted' };
}

async function callGemini(systemPrompt, userPrompt, opts = {}) {
  const rawKey = process.env.GEMINI_API_KEY || '';
  const GEMINI_KEY = rawKey.trim();
  const GEMINI_MODEL = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  if (!GEMINI_KEY) throw { source: 'provider', provider: 'gemini', code: 'MISSING_API_KEY', message: 'Gemini API key not configured' };

  const endpointBase = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
  const payload = {
    contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
    generationConfig: { temperature: 0.25, maxOutputTokens: opts.maxOutputTokens || 10000, candidateCount: 1 }
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

    if ([401, 403, 404].includes(resp.status)) {
      resp = await doRequest(true);
    }

    lastResp = resp;
    if (resp.status >= 200 && resp.status < 300) {
      let gemData = null;
      try { gemData = JSON.parse(resp.text); } catch (e) { gemData = null; }

      let assistantText = '';
      if (gemData?.candidates && Array.isArray(gemData.candidates) && gemData.candidates[0]?.content) {
        const content = gemData.candidates[0].content;
        if (content.parts && Array.isArray(content.parts) && content.parts.length > 0) {
          assistantText = content.parts.map(p => p?.text || '').join('');
        } else if (typeof content === 'string') {
          assistantText = content;
        } else {
          assistantText = '';
        }
      } else if (gemData?.responseText) {
        assistantText = gemData.responseText;
      } else {
        assistantText = resp.text;
      }

      assistantText = stripCodeFences(assistantText);
      return { assistantText, rawResponse: resp.text, gemData };
    }

    if (resp.status >= 500 && resp.status < 600 && attempt < maxAttempts) {
      await sleep(500 * Math.pow(2, attempt - 1));
      continue;
    }

    break;
  }

  const details = lastResp ? lastResp.text : 'No response body';
  const status = lastResp ? lastResp.status : 'unknown';
  throw { source: 'provider', provider: 'gemini', code: 'PROVIDER_ERROR', status, message: 'Gemini API error', details };
}

// ---------- Plain text generation (no JSON parse) ----------
// Returns assistantText (string) and rawResponse.
async function generatePlainText({ provider, systemPrompt, userPrompt, extra = {} }) {
  // DEMO_MODE short-circuit handled by wrappers via getDemoSupplement, but also safe here
  provider = (provider || process.env.DEFAULT_PROVIDER || 'openai').toLowerCase();
  if (provider === 'openai') {
    const { assistantText, rawResponse } = await callOpenAI(systemPrompt, userPrompt, { max_tokens: extra.max_tokens || extra.maxOutputTokens });
    return { assistantText: stripCodeFences(assistantText), rawResponse };
  }
  if (provider === 'huggingface') {
    const { assistantText, rawResponse } = await callHuggingFace(systemPrompt, userPrompt, { hf_max_new_tokens: extra.hf_max_new_tokens || extra.maxOutputTokens });
    return { assistantText: stripCodeFences(assistantText), rawResponse };
  }
  if (provider === 'gemini') {
    const { assistantText, rawResponse } = await callGemini(systemPrompt, userPrompt, { maxOutputTokens: extra.maxOutputTokens || 10000 });
    return { assistantText: stripCodeFences(assistantText), rawResponse };
  }
  throw { source: 'wrapper', code: 'UNSUPPORTED_PROVIDER', message: `Unsupported provider: ${provider}` };
}

// DEMO supplement retrieval (returns plain string for expansion or hint)
function getDemoSupplement({ type = 'expansion', index = 0 }) {
  if (!DEMO_FIXTURE || !Array.isArray(DEMO_FIXTURE.micro_lessons)) {
    throw { source: 'demo', code: 'NO_DEMO', message: 'No demo fixture available' };
  }
  const lessons = DEMO_FIXTURE.micro_lessons;
  const idx = Math.min(Math.max(0, Number(index) || 0), lessons.length - 1);
  const lesson = lessons[idx] || {};
  if (type === 'expansion') {
    return lesson.full_guide || (typeof lesson.full_guide === 'string' ? lesson.full_guide : '');
  }
  // hint
  if (type === 'hint') {
    if (Array.isArray(lesson.hints) && lesson.hints.length > 0) return lesson.hints[0];
    // fallback: generate a tiny hint from tip or practice_task
    return lesson.tip ? lesson.tip.split('.').slice(0,1).join('.') : (lesson.practice_task ? `Try: ${lesson.practice_task.split('.').slice(0,1).join('.')}` : 'Try a small focused attempt.');
  }
  return '';
}

// Public API
async function generateForProvider({ provider, userPrompt, extra = {} }) {
  // If DEMO_MODE is enabled, return DEMO_FIXTURE immediately (single source of demo)
  if (String(process.env.DEMO_MODE).toLowerCase() === 'true') {
    console.log('lib.aiClient: DEMO_MODE=true — returning demo fixture');
    return { parsed: DEMO_FIXTURE, raw: JSON.stringify(DEMO_FIXTURE), assistantText: null };
  }

  // load prompts (synchronously from CommonJS module)
  const prompts = loadPromptsModuleSync();
  const systemPrompt = prompts.SYSTEM_PROMPT;

  provider = (provider || process.env.DEFAULT_PROVIDER || 'openai').toLowerCase();

  if (!userPrompt || typeof userPrompt !== 'string') {
    throw { source: 'wrapper', code: 'MISSING_USER_PROMPT', message: 'userPrompt is required and must be a string' };
  }

  if (provider === 'openai') {
    const { assistantText, rawResponse } = await callOpenAI(systemPrompt, userPrompt, { max_tokens: extra.max_tokens });
    const cleaned = stripCodeFences(assistantText);
    const parsed = tryParseJSON(cleaned);
    if (parsed) return { parsed, raw: rawResponse, assistantText: cleaned };
    if (!assistantText || assistantText.trim().length === 0) throw { source: 'provider', provider: 'openai', code: 'EMPTY_RESPONSE', message: 'OpenAI returned empty text', details: rawResponse };
    throw { source: 'provider', provider: 'openai', code: 'PARSE_ERROR', message: 'OpenAI output not JSON', details: cleaned };
  }

  if (provider === 'huggingface') {
    const { assistantText, rawResponse } = await callHuggingFace(systemPrompt, userPrompt, { hf_max_new_tokens: extra.hf_max_new_tokens });
    const cleaned = stripCodeFences(assistantText);
    const parsed = tryParseJSON(cleaned);
    if (parsed) return { parsed, raw: rawResponse, assistantText: cleaned };
    if (!assistantText || assistantText.trim().length === 0) throw { source: 'provider', provider: 'huggingface', code: 'EMPTY_RESPONSE', message: 'HuggingFace returned empty text', details: rawResponse };
    throw { source: 'provider', provider: 'huggingface', code: 'PARSE_ERROR', message: 'HuggingFace output not JSON', details: cleaned };
  }

  if (provider === 'gemini') {
    const { assistantText, rawResponse } = await callGemini(systemPrompt, userPrompt, { maxOutputTokens: extra.maxOutputTokens || 10000 });
    const cleaned = stripCodeFences(assistantText || '');
    const parsed = tryParseJSON(cleaned);
    if (parsed) return { parsed, raw: rawResponse, assistantText: cleaned };
    if (!assistantText || assistantText.trim().length === 0) throw { source: 'provider', provider: 'gemini', code: 'EMPTY_RESPONSE', message: 'Gemini returned empty text or no parts', details: rawResponse };
    throw { source: 'provider', provider: 'gemini', code: 'PARSE_ERROR', message: 'Gemini output not JSON', details: cleaned };
  }

  throw { source: 'wrapper', code: 'UNSUPPORTED_PROVIDER', message: `Unsupported provider: ${provider}` };
}

module.exports = {
  generateForProvider,
  stripCodeFences,
  tryParseJSON,
  generatePlainText,
  getDemoSupplement
};
