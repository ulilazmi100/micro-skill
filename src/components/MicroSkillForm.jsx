// src/components/MicroSkillForm.jsx
import React, { useState, useEffect } from 'react';
import MicroLessonCard from './MicroLessonCard';
import { generateMicroContent, fetchSupplement } from '../utils/api';

// LocalStorage keys
const PRACTICED_KEY = 'micro_practiced_v1';
const STREAK_KEY = 'micro_streak_v1';

function readPracticedSet() {
  try {
    const raw = localStorage.getItem(PRACTICED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr);
  } catch (e) {
    return new Set();
  }
}

function writePracticedSet(set) {
  try {
    const arr = Array.from(set);
    localStorage.setItem(PRACTICED_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn(e);
  }
}

function readStreak() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { lastDate: null, streak: 0 };
    return JSON.parse(raw);
  } catch (e) {
    return { lastDate: null, streak: 0 };
  }
}

function writeStreak(obj) {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn(e);
  }
}

// helper to format YYYY-MM-DD
function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// Build exportable guide text for each lesson (simple deterministic)
function buildGuideText(lesson, idx) {
  const title = lesson.title || `Lesson ${idx + 1}`;
  const tip = lesson.tip || '';
  const practice = lesson.practice_task || '';
  const example = lesson.example_output || '';
  const difficulty = lesson.difficulty || 'unknown';
  const guide = lesson.full_guide || lesson.fullGuideText || (`Objective: ${title}\n\nTip: ${tip}\n\nPractice task: ${practice}\n\nExample output: ${example}\n\nDifficulty: ${difficulty}\n`);
  // sanitize and ensure newlines
  return `## ${idx + 1}. ${title}\n\n${guide}\n`;
}

export default function MicroSkillForm() {
  const defaultProvider = import.meta.env.VITE_DEFAULT_PROVIDER || 'openai';
  const functionPath = import.meta.env.VITE_FUNCTION_PATH || '/api/generate';
  const demoMode = String(import.meta.env.VITE_DEMO_MODE || '').toLowerCase() === 'true' || String(import.meta.env.VITE_DEMO_MODE || '') === '1';

  const [jobTitle, setJobTitle] = useState('');
  const [skillLevel, setSkillLevel] = useState('beginner');
  const [strengths, setStrengths] = useState('');
  const [platform, setPlatform] = useState('');
  const [jobDesc, setJobDesc] = useState('');

  const [provider, setProvider] = useState(defaultProvider);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [practicedSet, setPracticedSet] = useState(readPracticedSet());
  const [streak, setStreak] = useState(() => readStreak().streak);

  // refresh practiced set on mount
  useEffect(() => {
    setPracticedSet(readPracticedSet());
    setStreak(readStreak().streak || 0);
  }, []);

  // storage event listener for cross-tab and synthetic events
  useEffect(() => {
    function onStorage(e) {
      if (!e) {
        setPracticedSet(readPracticedSet());
        setStreak(readStreak().streak || 0);
        return;
      }
      if (e.key === PRACTICED_KEY) {
        setPracticedSet(readPracticedSet());
      }
      if (e.key === STREAK_KEY) {
        setStreak(readStreak().streak || 0);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  async function onGenerate() {
    setLoading(true);
    setError(null);
    // Note: generation replaces result (lessons) and resets practiced set
    try {
      const payload = { jobTitle, skillLevel, strengths, platform, jobDesc, provider };
      const res = await generateMicroContent(payload);
      setResult(res);
      // reset practiced set for new lessons
      writePracticedSet(new Set());
      setPracticedSet(new Set());
    } catch (err) {
      console.error(err);
      if (err && typeof err === 'object' && err.message) {
        setError(err.message);
      } else if (err && typeof err === 'string') {
        setError(err);
      } else {
        setError('Failed to generate');
      }
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text) {
    if (!text) return;
    if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
  }

  function loadDemo() {
    setJobTitle('Frontend bug fix');
    setSkillLevel('beginner');
    setStrengths('fast turnarounds, clear communication');
    setPlatform('Upwork');
    setJobDesc('The UI button is not responding and needs a fix. Must include tests and a demo.');
    setResult(null);
    setError(null);
  }

  // CLEAR now only clears inputs (jobTitle, skillLevel, strengths, platform, jobDesc)
  function clearForm() {
    setJobTitle('');
    setSkillLevel('beginner');
    setStrengths('');
    setPlatform('');
    setJobDesc('');
    setError(null);
    // do NOT touch result, practicedSet, or streak here
  }

  // export all practice routines (Markdown) and download
  function exportAll() {
    if (!result || !Array.isArray(result.micro_lessons)) return;
    const mdParts = [];
    mdParts.push(`# MicroSkill Practice Pack\n`);
    mdParts.push(`Job Title: ${jobTitle || '—'}\n`);
    mdParts.push(`Generated: ${new Date().toISOString()}\n\n`);
    result.micro_lessons.forEach((lesson, i) => {
      mdParts.push(buildGuideText(lesson, i));
    });
    const blob = new Blob([mdParts.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(jobTitle || 'micro-practice').replace(/\s+/g, '-').toLowerCase()}-practice.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // fetchSupplement wrapper to call server
  async function handleFetchSupplement({ type, lessonIndex, lesson }) {
    if (type === 'expansion' && (lesson.full_guide || lesson.fullGuideText)) {
      return { supplement: lesson.full_guide || lesson.fullGuideText };
    }
    if (type === 'hint' && lesson.hints && lesson.hints.length > 0 && lesson.hints[0]) {
      return { supplement: lesson.hints[0] };
    }

    try {
      const resp = await fetchSupplement({
        action: type === 'expansion' ? 'fetch_expansion' : 'fetch_hint',
        lessonIndex,
        lesson,
        jobTitle,
        skillLevel,
        strengths,
        platform,
        jobDesc,
        provider
      });
      return resp;
    } catch (err) {
      throw err;
    }
  }

  // Save supplement into result state (persist)
  function handleSaveSupplement(index, patch) {
    if (!result || !Array.isArray(result.micro_lessons)) return;
    const copy = JSON.parse(JSON.stringify(result));
    copy.micro_lessons[index] = Object.assign({}, copy.micro_lessons[index] || {}, patch);
    setResult(copy);
  }

  // mark practiced action used by UI to update streak if marking for today's date
  function onLessonPracticedToggled(markedToday) {
    setPracticedSet(readPracticedSet());

    const s = readStreak();
    const lastDate = s.lastDate;
    const today = todayISO(0);
    if (markedToday) {
      if (lastDate === today) {
        // already counted today
      } else {
        if (lastDate === todayISO(-1)) {
          s.streak = (s.streak || 0) + 1;
        } else {
          s.streak = 1;
        }
        s.lastDate = today;
        writeStreak(s);
        setStreak(s.streak);
        try { localStorage.setItem(STREAK_KEY, JSON.stringify(s)); } catch {}
      }
    }
  }

  // progress calculation
  const totalLessons = Array.isArray(result?.micro_lessons) ? result.micro_lessons.length : 0;
  const practicedCount = practicedSet.size;
  const progressPct = totalLessons > 0 ? Math.round((practicedCount / totalLessons) * 100) : 0;

  return (
    <div>
      {/* Gamification header */}
      <div className="mb-4 p-3 rounded bg-gradient-to-r from-blue-50 to-white border">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">Practice progress</div>
            <div className="text-xl font-semibold">{practicedCount}/{totalLessons} practiced</div>
            <div className="text-xs text-gray-500 mt-1">Streak: <strong>{streak}</strong> day{streak === 1 ? '' : 's'}</div>
          </div>
          <div className="w-64">
            <div className="h-3 bg-gray-200 rounded overflow-hidden">
              <div className="h-3 bg-green-500" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="text-xs text-gray-500 mt-1 text-right">{progressPct}%</div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 gap-3 mb-4">
        <input className="p-2 border rounded" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Job Title (e.g. Frontend bug fix)" />
        <select className="p-2 border rounded" value={skillLevel} onChange={e => setSkillLevel(e.target.value)}>
          <option value="beginner">beginner</option>
          <option value="intermediate">intermediate</option>
          <option value="experienced">experienced</option>
        </select>
        <input className="p-2 border rounded" value={strengths} onChange={e => setStrengths(e.target.value)} placeholder="Strengths (comma-separated)" />
        <input className="p-2 border rounded" value={platform} onChange={e => setPlatform(e.target.value)} placeholder="Platform (optional)" />
        <textarea className="p-2 border rounded" value={jobDesc} onChange={e => setJobDesc(e.target.value)} rows={4} placeholder="Paste job description" />
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
          <input className="p-2 border rounded w-full bg-gray-50" value={functionPath} readOnly />
          <div className="text-xs text-gray-500 mt-1">If using Netlify, set <code>VITE_FUNCTION_PATH=/.netlify/functions/generate</code></div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button disabled={loading} onClick={onGenerate} className="px-4 py-2 bg-blue-600 text-white rounded">
          {loading ? 'Generating…' : 'Generate'}
        </button>

        {demoMode && (
          <button onClick={loadDemo} className="px-4 py-2 border rounded bg-gray-50">Load Demo</button>
        )}

        <button onClick={clearForm} className="px-4 py-2 border rounded">Clear</button>

        <div className="ml-auto flex gap-2">
          <button onClick={exportAll} disabled={!result} className="px-4 py-2 border rounded bg-white">Export All (MD)</button>
        </div>
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      {/* Results */}
      {result && (
        <div>
          <section className="mb-4">
            <h2 className="font-semibold">Micro-lessons</h2>
            <div className="grid gap-3 mt-2">
              {Array.isArray(result.micro_lessons) && result.micro_lessons.length > 0 ? (
                result.micro_lessons.map((m, idx) => (
                  <MicroLessonCard
                    key={idx}
                    index={idx}
                    lesson={m}
                    fetchSupplement={({ type, lessonIndex, lesson }) => handleFetchSupplement({ type, lessonIndex, lesson })}
                    onSaveSupplement={(i, patch) => handleSaveSupplement(i, patch)}
                    onPracticedToggle={(isNowPracticed) => {
                      setPracticedSet(readPracticedSet());
                      if (isNowPracticed) onLessonPracticedToggled(true);
                    }}
                  />
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
