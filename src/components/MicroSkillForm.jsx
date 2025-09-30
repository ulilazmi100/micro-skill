// src/components/MicroSkillForm.jsx
import React, { useState, useEffect } from 'react';
import MicroLessonCard from './MicroLessonCard';
import { generateMicroContent } from '../utils/api';

export default function MicroSkillForm() {
  // Read build-time Vite envs
  const defaultProvider = import.meta.env.VITE_DEFAULT_PROVIDER || 'openai';
  const functionPath = import.meta.env.VITE_FUNCTION_PATH || '/api/generate';
  const demoMode = String(import.meta.env.VITE_DEMO_MODE || '').toLowerCase() === 'true' || String(import.meta.env.VITE_DEMO_MODE || '') === '1';

  // Start with empty inputs (user requested empty form before typing)
  const [jobTitle, setJobTitle] = useState('');
  const [skillLevel, setSkillLevel] = useState('beginner');
  const [strengths, setStrengths] = useState('');
  const [platform, setPlatform] = useState('');
  const [jobDesc, setJobDesc] = useState('');

  const [provider, setProvider] = useState(defaultProvider);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Clear result/error when user edits input to avoid stale display
  useEffect(() => {
    setError(null);
    // keep result until user hits Generate or Load Demo (not clearing on every small change to avoid jarring UX)
  }, [jobTitle, skillLevel, strengths, platform, jobDesc, provider]);

  async function onGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload = { jobTitle, skillLevel, strengths, platform, jobDesc, provider };
      const res = await generateMicroContent(payload);
      setResult(res);
    } catch (err) {
      console.error(err);
      // normalize error display
      if (err && typeof err === 'object' && err.error) {
        setError(typeof err.error === 'string' ? err.error : JSON.stringify(err.error));
      } else {
        setError(err.message || 'Failed to generate');
      }
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text) {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch((e) => {
        console.warn('Clipboard write failed', e);
      });
    } else {
      // fallback (best-effort)
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e) {
        console.warn('Fallback clipboard failed', e);
      }
    }
  }

  function loadDemo() {
    // demo values — single source, small and friendly
    setJobTitle('Frontend bug fix');
    setSkillLevel('beginner');
    setStrengths('fast turnarounds, clear communication');
    setPlatform('Upwork');
    setJobDesc('The UI button is not responding and needs a fix. Must include tests and a demo.');
    setResult(null);
    setError(null);
  }

  function clearForm() {
    setJobTitle('');
    setSkillLevel('beginner');
    setStrengths('');
    setPlatform('');
    setJobDesc('');
    setResult(null);
    setError(null);
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 mb-4">
        <input
          className="p-2 border rounded"
          value={jobTitle}
          onChange={e => setJobTitle(e.target.value)}
          placeholder="Job Title (e.g. Frontend bug fix)"
          aria-label="Job Title"
        />

        <select
          className="p-2 border rounded"
          value={skillLevel}
          onChange={e => setSkillLevel(e.target.value)}
          aria-label="Skill level"
        >
          <option value="beginner">beginner</option>
          <option value="intermediate">intermediate</option>
          <option value="experienced">experienced</option>
        </select>

        <input
          className="p-2 border rounded"
          value={strengths}
          onChange={e => setStrengths(e.target.value)}
          placeholder="Strengths (comma-separated)"
          aria-label="Strengths"
        />

        <input
          className="p-2 border rounded"
          value={platform}
          onChange={e => setPlatform(e.target.value)}
          placeholder="Platform (optional, e.g., Upwork)"
          aria-label="Platform"
        />

        <textarea
          className="p-2 border rounded"
          value={jobDesc}
          onChange={e => setJobDesc(e.target.value)}
          rows={4}
          placeholder="Paste full job description here (required)"
          aria-label="Job description"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-sm block mb-1">Provider</label>
          <select
            className="p-2 border rounded w-full"
            value={provider}
            onChange={e => setProvider(e.target.value)}
            aria-label="Model provider"
          >
            <option value="openai">OpenAI (recommended)</option>
            <option value="huggingface">Hugging Face (open models)</option>
            <option value="gemini">Gemini (Google)</option>
          </select>
          <div className="text-xs text-gray-500 mt-1">Choose your model provider (OpenAI, HF, or Gemini)</div>
        </div>

        <div>
          <label className="text-sm block mb-1">Function Path</label>
          <input
            className="p-2 border rounded w-full bg-gray-50"
            value={functionPath}
            readOnly
            aria-readonly="true"
            aria-label="Function path"
          />
          <div className="text-xs text-gray-500 mt-1">If using Netlify, set <code>VITE_FUNCTION_PATH=/.netlify/functions/generate</code></div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          disabled={loading}
          onClick={onGenerate}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
          title="Generate micro-lessons"
        >
          {loading ? 'Generating…' : 'Generate'}
        </button>

        {demoMode && (
          <button
            onClick={loadDemo}
            className="px-4 py-2 border rounded bg-gray-50 hover:bg-gray-100"
            title="Load example demo values"
            disabled={loading}
          >
            Load Demo
          </button>
        )}

        <button
          onClick={clearForm}
          className="px-4 py-2 border rounded"
          disabled={loading}
          title="Clear form"
        >
          Clear
        </button>
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      {result && (
        <div>
          <section className="mb-4">
            <h2 className="font-semibold">Micro-lessons</h2>
            <div className="grid gap-3 mt-2">
              {Array.isArray(result.micro_lessons) && result.micro_lessons.length > 0 ? (
                result.micro_lessons.map((m, idx) => (
                  <MicroLessonCard key={idx} lesson={m} />
                ))
              ) : (
                <div className="text-sm text-gray-500">No micro-lessons returned</div>
              )}
            </div>
          </section>

          <section className="mb-4">
            <h2 className="font-semibold">Profile blurbs</h2>
            <div className="mt-2 space-y-2">
              <div className="p-3 border rounded flex justify-between items-start">
                <div>
                  <div className="text-sm font-medium">Short</div>
                  <div className="text-sm">{result.profile_short}</div>
                </div>
                <button onClick={() => copyToClipboard(result.profile_short)} className="px-3 py-1 border rounded">Copy</button>
              </div>

              <div className="p-3 border rounded flex justify-between items-start">
                <div>
                  <div className="text-sm font-medium">Long</div>
                  <div className="text-sm">{result.profile_long}</div>
                </div>
                <button onClick={() => copyToClipboard(result.profile_long)} className="px-3 py-1 border rounded">Copy</button>
              </div>
            </div>
          </section>

          <section className="mb-4">
            <h2 className="font-semibold">Cover message</h2>
            <div className="mt-2 p-3 border rounded flex justify-between items-start">
              <div className="text-sm">{result.cover_message}</div>
              <div className="flex flex-col gap-2">
                <button onClick={() => copyToClipboard(result.cover_message)} className="px-3 py-1 border rounded">Copy</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
