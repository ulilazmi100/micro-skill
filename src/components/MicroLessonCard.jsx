// src/components/MicroLessonCard.jsx
import React, { useState, useEffect } from 'react';

/**
 * MicroLessonCard (copy-aware)
 *
 * Copies reflect the *visible* state:
 * - includes difficulty & practiced status
 * - includes hint if shown
 * - includes expanded full guide if expanded
 *
 * Works offline-first: uses lesson fields (title, tip, practice_task, example_output, full_guide, hints, further_reads, difficulty)
 */

const STORAGE_KEY = 'micro_practiced_v1';

function readPracticedSet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    // Dispatch a storage event-like notification for listeners
    try {
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}
  } catch (e) {
    console.warn('writePracticedSet failed', e);
  }
}

function searchLink(q) {
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

function buildExpandedGuide(lesson, idx) {
  const title = lesson.title || `Lesson ${idx + 1}`;
  const tip = lesson.tip || lesson.practice_task || '';
  const practice = lesson.practice_task || '';
  const example = lesson.example_output || '';

  const objective = `Objective — What you'll accomplish: ${title}. Focus: ${practice ? practice : tip}.`;
  const why = `Why it matters: This practice builds muscle memory for the specific task and reduces future friction. Short, repeated practice embeds the workflow.`;

  const steps = [
    '1) Reproduce the scenario quickly — replicate the failing behavior or target outcome.',
    '2) Isolate the smallest element/component responsible — reduce to a minimal reproduction.',
    '3) Implement a focused change or experiment to address the immediate cause.',
    '4) Verify with a quick test or manual check; ensure the behavior improved.',
    '5) Document the change, write a short test or checklist, and record results.'
  ];

  const practiceVerb = (practice.match(/\b(create|add|fix|write|test|record|reproduce|isolate|implement|run)\b/i) || [])[0];
  const tailoredTip = practiceVerb ? `Pro tip: When you ${practiceVerb.toLowerCase()}, keep the scope minimal and commit atomic changes.` : 'Pro tip: Keep changes small and tests focused.';

  const routine = [
    `Repeat 1 (5–10 minutes): Reproduce + perform the minimal fix.`,
    `Repeat 2 (5–10 minutes): Add a short test or run checklist.`,
    `Repeat 3 (3–5 minutes): Document the steps and confirm no regressions.`
  ];

  const timeEstimate = 'Time estimate: 15–30 minutes (depending on complexity).';

  const keywords = [title, practice, example].filter(Boolean).slice(0, 3).join(' ');
  const furtherReads = lesson.further_reads && Array.isArray(lesson.further_reads) && lesson.further_reads.length > 0
    ? lesson.further_reads
    : [
      { title: `Quick search: ${title}`, url: searchLink(keywords || title) },
      { title: 'How to write focused tests', url: searchLink('how to write focused unit tests') },
      { title: 'Minimal reproducible examples', url: searchLink('minimal reproducible example guide') }
    ];

  const fullGuideText = [
    `### ${title}`,
    '',
    objective,
    '',
    why,
    '',
    'Steps:',
    ...steps,
    '',
    tailoredTip,
    '',
    'Practice routine:',
    ...routine,
    '',
    timeEstimate,
    '',
    'Example output:',
    `- ${example || 'Example not provided'}`,
    '',
    'Further reads:',
    ...furtherReads.map((fr) => `- ${fr.title} — ${fr.url}`)
  ].join('\n');

  return {
    fullGuideText,
    objective,
    why,
    steps,
    tailoredTip,
    routine,
    timeEstimate,
    furtherReads
  };
}

/* ---------- inline icons (tiny) ---------- */

function IconChevronDown({ size = 14 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function IconChevronUp({ size = 14 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function IconLightbulb({ size = 14 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M9 18h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M10 22h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M12 2a6 6 0 00-4 10.6V15a2 2 0 002 2h4a2 2 0 002-2v-2.4A6 6 0 0012 2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function IconCopy({ size = 14 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M5 15V7a2 2 0 012-2h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function IconCheck({ size = 14 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function IconClock({ size = 14 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" /><path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function IconExternal({ size = 12 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M14 3h7v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 14L21 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 21H3V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>); }

/* ---------- component ---------- */

export default function MicroLessonCard({ lesson = {}, index = 0, onPracticedToggle = () => {} }) {
  const [expanded, setExpanded] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [practiced, setPracticed] = useState(false);
  const [guide, setGuide] = useState(null);

  useEffect(() => {
    const setFromStorage = readPracticedSet();
    setPracticed(setFromStorage.has(String(index)));
  }, [index]);

  function ensureGuide() {
    if (guide) return guide;
    const g = lesson.full_guide ? { fullGuideText: lesson.full_guide } : buildExpandedGuide(lesson, index);
    setGuide(g);
    return g;
  }

  function toggleExpanded() {
    if (!expanded) ensureGuide();
    setExpanded(!expanded);
  }

  function toggleHint() {
    setShowHint(!showHint);
  }

  function togglePracticed() {
    const setStorage = readPracticedSet();
    const key = String(index);
    let nowPracticed;
    if (setStorage.has(key)) {
      setStorage.delete(key);
      setPracticed(false);
      nowPracticed = false;
    } else {
      setStorage.add(key);
      setPracticed(true);
      nowPracticed = true;
    }
    writePracticedSet(setStorage);
    try { onPracticedToggle(nowPracticed); } catch (e) {}
  }

  // Build copy text that exactly mirrors what the user sees (status, difficulty, hint, expanded guide)
  function buildCopyText(context = 'practice') {
    // context: 'practice' (default) | 'guide' (explicit copy guide)
    const title = lesson.title || `Lesson ${index + 1}`;
    const difficulty = lesson.difficulty || 'Beginner';
    const status = practiced ? 'Practiced' : 'Not practiced';
    const tip = lesson.tip || '';
    const practice = lesson.practice_task || '';
    const example = lesson.example_output || '';
    const hintText = (lesson.hints && lesson.hints.length > 0) ? lesson.hints[0] : (practice ? `Try: ${practice.split('.').slice(0,1).join('.')} — keep it minimal.` : '');

    const lines = [];
    lines.push(`${index + 1}. ${title}`);
    lines.push(`Difficulty: ${difficulty}`);
    lines.push(`Status: ${status}`);
    lines.push('');
    if (tip) lines.push(`Tip: ${tip}`);
    if (practice) lines.push(`Practice task: ${practice}`);
    if (example) lines.push(`Example output: ${example}`);
    lines.push('');

    if (showHint && hintText) {
      lines.push('Hint:');
      lines.push(hintText);
      lines.push('');
    }

    // if expanded or explicit guide copy, include the full guide
    if (expanded || context === 'guide') {
      const g = ensureGuide();
      if (g.fullGuideText) {
        lines.push('---');
        lines.push('Full Guide:');
        lines.push(g.fullGuideText);
        lines.push('---');
      } else {
        // fall back to composing pieces
        if (g.objective) {
          lines.push('Objective:');
          lines.push(g.objective);
          lines.push('');
        }
        if (g.why) {
          lines.push('Why it matters:');
          lines.push(g.why);
          lines.push('');
        }
        if (g.steps && g.steps.length > 0) {
          lines.push('Steps:');
          g.steps.forEach(s => lines.push(`- ${s.replace(/^\d+\)\s*/, '')}`));
          lines.push('');
        }
        if (g.tailoredTip) {
          lines.push('Pro tip:');
          lines.push(g.tailoredTip);
          lines.push('');
        }
        if (g.routine && g.routine.length > 0) {
          lines.push('Practice routine:');
          g.routine.forEach(r => lines.push(`- ${r}`));
          lines.push('');
        }
        if (g.timeEstimate) {
          lines.push(`Time estimate: ${g.timeEstimate}`);
          lines.push('');
        }
        if (g.furtherReads && g.furtherReads.length > 0) {
          lines.push('Further reads:');
          g.furtherReads.forEach(fr => lines.push(`- ${fr.title || fr} — ${fr.url || fr}`));
          lines.push('');
        }
      }
    }

    lines.push(`(copied from MicroSkill • ${new Date().toLocaleString()})`);

    return lines.join('\n');
  }

  function copyCurrentPractice() {
    const txt = buildCopyText('practice');
    if (!txt) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).catch((e) => {
        console.warn('clipboard failed', e);
      });
    } else {
      // fallback
      try {
        const ta = document.createElement('textarea');
        ta.value = txt;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e) {
        console.warn('fallback copy failed', e);
      }
    }
  }

  function copyGuide() {
    const txt = buildCopyText('guide');
    if (!txt) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).catch((e) => console.warn('clipboard failed', e));
    } else {
      // fallback
      try {
        const ta = document.createElement('textarea');
        ta.value = txt;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e) {
        console.warn('fallback copy failed', e);
      }
    }
  }

  const title = lesson.title || `Lesson ${index + 1}`;
  const tip = lesson.tip || '';
  const practice = lesson.practice_task || '';
  const example = lesson.example_output || '';
  const compactTip = tip.length > 140 ? tip.slice(0, 137) + '…' : tip;
  const difficulty = (lesson.difficulty || 'Beginner').toLowerCase();
  const diffClass = difficulty === 'experienced' ? 'bg-red-100 text-red-800' : (difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800');

  return (
    <article className="p-3 border rounded shadow-sm bg-white" aria-labelledby={`lesson-${index}-title`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 id={`lesson-${index}-title`} className="text-sm font-semibold">{index + 1}. {title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded ${diffClass}`}>{lesson.difficulty || 'Beginner'}</span>
          </div>

          <p className="text-xs text-gray-600 mt-1">{compactTip || <em className="text-gray-400">No tip provided</em>}</p>

          <div className="mt-2 text-xs text-gray-700"><strong>Practice:</strong> {practice || <span className="text-gray-400">—</span>}
            {example ? <span className="ml-3">• <em>{example}</em></span> : null}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            onClick={toggleExpanded}
            className="flex items-center gap-2 px-2 py-1 border rounded text-xs bg-gray-50 hover:bg-gray-100"
            aria-expanded={expanded}
            aria-controls={`lesson-${index}-details`}
            title={expanded ? 'Collapse' : 'Expand for full guide'}
          >
            {expanded ? <IconChevronUp /> : <IconChevronDown />} <span>{expanded ? 'Less' : 'Expand'}</span>
          </button>

          <button
            onClick={toggleHint}
            className="px-2 py-1 border rounded text-xs bg-yellow-50 hover:bg-yellow-100 flex items-center gap-2"
            title="Show / hide hint"
            aria-pressed={showHint}
          >
            <IconLightbulb /> <span>Hint</span>
          </button>

          <button
            onClick={copyCurrentPractice}
            className="px-2 py-1 border rounded text-xs bg-gray-50 hover:bg-gray-100 flex items-center gap-2"
            title="Copy this micro-lesson (visible content)"
          >
            <IconCopy /> <span>Copy</span>
          </button>

          <button
            onClick={togglePracticed}
            className={`px-2 py-1 rounded text-xs flex items-center gap-2 ${practiced ? 'bg-green-100 border-green-200' : 'border bg-white'}`}
            title={practiced ? 'Mark as not practiced' : 'Mark as practiced'}
            aria-pressed={practiced}
          >
            <IconCheck /> <span>{practiced ? 'Practiced' : 'Mark'}</span>
          </button>
        </div>
      </div>

      {showHint && (
        <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-gray-800">
          {lesson.hints && lesson.hints.length > 0 ? lesson.hints[0] : (practice ? `Try: ${practice.split('.').slice(0,1).join('.')} — keep it minimal.` : 'Try repeating the task twice focusing on one tiny substep.')}
        </div>
      )}

      {expanded && (
        <div id={`lesson-${index}-details`} className="mt-3 border-t pt-3 text-sm text-gray-800">
          {(() => {
            const g = ensureGuide();
            return (
              <div className="space-y-3">
                {g.objective && <div><strong>Objective</strong><div className="text-xs mt-1 text-gray-700">{g.objective}</div></div>}
                {g.why && <div><strong>Why it matters</strong><div className="text-xs mt-1 text-gray-700">{g.why}</div></div>}

                {g.steps && g.steps.length > 0 && (
                  <div>
                    <strong>Step-by-step</strong>
                    <ol className="mt-1 ml-4 text-xs list-decimal space-y-1">
                      {g.steps.map((s, i) => <li key={i}>{s.replace(/^\d+\)\s*/, '')}</li>)}
                    </ol>
                  </div>
                )}

                {g.tailoredTip && <div><strong>Pro tip</strong><div className="text-xs mt-1 text-gray-700">{g.tailoredTip}</div></div>}

                {g.routine && g.routine.length > 0 && (
                  <div>
                    <strong>Practice routine</strong>
                    <ul className="mt-1 ml-4 text-xs space-y-1">
                      {g.routine.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}

                {g.timeEstimate && <div className="flex items-center gap-2 text-xs text-gray-600"><IconClock /> <span>{g.timeEstimate}</span></div>}

                {lesson.example_output && (
                  <div>
                    <strong>Example output</strong>
                    <div className="mt-1 text-xs text-gray-700">{lesson.example_output}</div>
                  </div>
                )}

                {g.furtherReads && g.furtherReads.length > 0 && (
                  <div>
                    <strong>Further reads</strong>
                    <ul className="mt-1 ml-4 text-xs space-y-1">
                      {g.furtherReads.map((fr, i) => (
                        <li key={i}><a className="inline-flex items-center gap-2" href={fr.url || fr} rel="noreferrer" target="_blank"><IconExternal /> <span className="underline">{fr.title || fr}</span></a></li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2 mt-2">
                  <button onClick={copyGuide} className="px-3 py-1 border rounded text-xs">Copy Guide (full)</button>
                  <a href={`mailto:?subject=${encodeURIComponent('MicroSkill practice: ' + title)}&body=${encodeURIComponent((g.fullGuideText || '').substring(0, 2000))}`} className="px-3 py-1 border rounded text-xs">Share</a>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </article>
  );
}
