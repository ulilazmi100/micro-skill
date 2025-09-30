// lib/aiClient.js
// Shared AI client (CommonJS style module.exports)
// Centralized provider logic; imports prompts dynamically from prompts/prompts.js

const { fileURLToPath, pathToFileURL } = require('url');
const path = require('path');

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const DEFAULT_HF_MODEL = process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

// Helper: dynamically import the ESM prompts file from the project root
async function loadPromptsModule() {
  const promptsPath = path.join(process.cwd(), 'prompts', 'prompts.js');
  const fileUrl = pathToFileURL(promptsPath).href;
  const module = await import(fileUrl);
  // returns { SYSTEM_PROMPT, buildUserPrompt }
  return module;
}

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

// Provider call implementations (callers return { assistantText, rawResponse, gemData? } or throw structured error)
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
    console.log(`lib.aiClient: Gemini header attempt ${attempt} status=${resp.status}`);
    console.log(`lib.aiClient: Gemini body (header attempt): ${resp.text}`);

    if ([401, 403, 404].includes(resp.status)) {
      resp = await doRequest(true);
      console.log(`lib.aiClient: Gemini fallback attempt ${attempt} status=${resp.status}`);
      console.log(`lib.aiClient: Gemini body (fallback attempt): ${resp.text}`);
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

// Public API
/**
 * generateForProvider({ provider, userPrompt, extra })
 * Returns { parsed, raw, assistantText }
 * Throws structured errors
 */
async function generateForProvider({ provider, userPrompt, extra = {} }) {
  // load prompts to get system prompt (single source-of-truth)
  const prompts = await loadPromptsModule();
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

module.exports = { generateForProvider, stripCodeFences, tryParseJSON };
