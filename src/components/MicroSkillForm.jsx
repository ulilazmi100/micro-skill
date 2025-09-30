import React, { useState } from 'react';
import MicroLessonCard from './MicroLessonCard';
import { generateMicroContent } from '../utils/api';

export default function MicroSkillForm() {
  const [jobTitle, setJobTitle] = useState('Frontend bug fix');
  const [skillLevel, setSkillLevel] = useState('beginner');
  const [strengths, setStrengths] = useState('fast turnarounds, good communication');
  const [platform, setPlatform] = useState('Upwork');
  const [jobDesc, setJobDesc] = useState('The UI button is not responding and needs a fix. Must include tests and a demo.');

  const [provider, setProvider] = useState(import.meta.env.VITE_DEFAULT_PROVIDER || 'openai');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

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
      setError(err.message || 'Failed to generate');
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
  }

  function loadDemo() {
    setJobTitle('Frontend bug fix');
    setSkillLevel('beginner');
    setStrengths('fast turnarounds, good communication');
    setPlatform('Upwork');
    setJobDesc('The UI button is not responding and needs a fix. Must include tests and a demo.');
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 mb-4">
        <input className="p-2 border rounded" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Job Title" />
        <select className="p-2 border rounded" value={skillLevel} onChange={e => setSkillLevel(e.target.value)}>
          <option>beginner</option>
          <option>intermediate</option>
          <option>experienced</option>
        </select>
        <input className="p-2 border rounded" value={strengths} onChange={e => setStrengths(e.target.value)} placeholder="Strengths (comma-separated)" />
        <input className="p-2 border rounded" value={platform} onChange={e => setPlatform(e.target.value)} placeholder="Platform (optional)" />
        <textarea className="p-2 border rounded" value={jobDesc} onChange={e => setJobDesc(e.target.value)} rows={3} placeholder="Paste job description" />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-sm block mb-1">Provider</label>
          <select className="p-2 border rounded w-full" value={provider} onChange={e => setProvider(e.target.value)}>
            <option value="openai">OpenAI (recommended)</option>
            <option value="huggingface">Hugging Face (open models)</option>
            <option value="gemini">Gemini (Google)</option>
          </select>
          <div className="text-xs text-gray-500 mt-1">Choose your model provider (OpenAI, HF, or Gemini)</div>
        </div>

        <div>
          <label className="text-sm block mb-1">Function Path</label>
          <input className="p-2 border rounded w-full" defaultValue={import.meta.env.VITE_FUNCTION_PATH || '/api/generate'} readOnly />
          <div className="text-xs text-gray-500 mt-1">Set VITE_FUNCTION_PATH for Netlify if needed</div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button disabled={loading} onClick={onGenerate} className="px-4 py-2 bg-blue-600 text-white rounded">
          {loading ? 'Generating…' : 'Generate'}
        </button>
        <button onClick={loadDemo} className="px-4 py-2 border rounded">Load Demo</button>
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      {result && (
        <div>
          <section className="mb-4">
            <h2 className="font-semibold">Micro-lessons</h2>
            <div className="grid gap-3 mt-2">
              {result.micro_lessons?.map((m, idx) => (
                <MicroLessonCard key={idx} lesson={m} />
              )) || <div className="text-sm text-gray-500">No micro-lessons returned</div>}
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
