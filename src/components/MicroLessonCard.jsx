// src/components/MicroLessonCard.jsx
import React, { useState, useEffect, useRef } from 'react';

/**
 * MicroLessonCard with on-demand supplement fetch + Markdown rendering (lightweight).
 *
 * Props:
 * - lesson: object
 * - index: number
 * - fetchSupplement: async function({ type, lessonIndex, lesson }) => { supplement }
 * - onSaveSupplement: function(index, patch)
 * - onPracticedToggle: function(isNowPracticed)
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
    try { window.dispatchEvent(new Event('storage')); } catch (e) {}
  } catch (e) {
    console.warn('writePracticedSet failed', e);
  }
}

// Minimal markdown -> HTML converter to display expansions.
// Supports: headings (#, ##, ###), unordered lists (- item), ordered lists (1. item or 1) item),
// links [text](url), bold **text**, italic *text*, paragraphs and line breaks.
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function mdToHtml(md) {
  if (!md) return '';
  const lines = String(md).split(/\r?\n/);
  let out = '';
  let inUl = false;
  let inOl = false;

  function closeLists() {
    if (inUl) { out += '</ul>'; inUl = false; }
    if (inOl) { out += '</ol>'; inOl = false; }
  }

  function inlineFormat(text) {
    // escape HTML first
    let t = escapeHtml(text);
    // links: [text](url)
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    // bold **text**
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // italic *text*
    t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return t;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === '') {
      closeLists();
      out += '<p></p>';
      continue;
    }

    // headings
    if (/^###\s+/.test(line)) {
      closeLists();
      out += `<h3>${inlineFormat(line.replace(/^###\s+/, ''))}</h3>`;
      continue;
    }
    if (/^##\s+/.test(line)) {
      closeLists();
      out += `<h2>${inlineFormat(line.replace(/^##\s+/, ''))}</h2>`;
      continue;
    }
    if (/^#\s+/.test(line)) {
      closeLists();
      out += `<h1>${inlineFormat(line.replace(/^#\s+/, ''))}</h1>`;
      continue;
    }

    // unordered list
    if (/^[-*]\s+/.test(line)) {
      if (!inUl) { closeLists(); out += '<ul>'; inUl = true; }
      out += `<li>${inlineFormat(line.replace(/^[-*]\s+/, ''))}</li>`;
      continue;
    }

    // ordered list: "1. " or "1) "
    if (/^\d+[\.\)]\s+/.test(line)) {
      if (!inOl) { closeLists(); out += '<ol>'; inOl = true; }
      out += `<li>${inlineFormat(line.replace(/^\d+[\.\)]\s+/, ''))}</li>`;
      continue;
    }

    // paragraphs / normal lines
    out += `<p>${inlineFormat(line)}</p>`;
  }

  closeLists();
  return out;
}

/* inline icons (tiny SVGs) */
function IconChevronDown({ size = 14 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function IconChevronUp({ size = 14 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function IconLightbulb({ size = 14 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M9 18h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M10 22h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M12 2a6 6 0 00-4 10.6V15a2 2 0 002 2h4a2 2 0 002-2v-2.4A6 6 0 0012 2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function IconCopy({ size = 14 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M5 15V7a2 2 0 012-2h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function IconCheck({ size = 14 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function IconClock({ size = 14 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" /><path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function IconExternal({ size = 12 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M14 3h7v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 14L21 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 21H3V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>); }

export default function MicroLessonCard({
  lesson = {},
  index = 0,
  fetchSupplement = null,
  onSaveSupplement = null,
  onPracticedToggle = () => {}
}) {
  const [expanded, setExpanded] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [practiced, setPracticed] = useState(false);
  const [guideHtml, setGuideHtml] = useState(null);

  const [loadingExpansion, setLoadingExpansion] = useState(false);
  const [loadingHint, setLoadingHint] = useState(false);

  const [copied, setCopied] = useState(false);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    const setFromStorage = readPracticedSet();
    setPracticed(setFromStorage.has(String(index)));
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [index]);

  // ensure we have guideHtml if lesson.full_guide exists
  useEffect(() => {
    if ((lesson.full_guide || lesson.fullGuideText) && !guideHtml) {
      const md = lesson.full_guide || lesson.fullGuideText || '';
      setGuideHtml(mdToHtml(md));
    }
  }, [lesson, guideHtml]);

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

  async function handleFetchExpansion() {
    if (lesson.full_guide || lesson.fullGuideText) {
      setExpanded(e => !e);
      return;
    }
    if (!fetchSupplement) {
      // fallback: build small guide client-side
      const fallback = `### ${lesson.title || `Lesson ${index+1}`}\n\nObjective: ${lesson.title}\n\nTip: ${lesson.tip || ''}\n`;
      setGuideHtml(mdToHtml(fallback));
      setExpanded(true);
      onSaveSupplement && onSaveSupplement(index, { full_guide: fallback });
      return;
    }
    try {
      setLoadingExpansion(true);
      const resp = await fetchSupplement({ type: 'expansion', lessonIndex: index, lesson });
      const text = resp && (resp.supplement || resp) ? (resp.supplement || resp) : '';
      if (text && text.trim().length > 0) {
        onSaveSupplement && onSaveSupplement(index, { full_guide: text });
        setGuideHtml(mdToHtml(text));
      } else {
        const fallback = `### ${lesson.title || `Lesson ${index+1}`}\n\nObjective: ${lesson.title}\n\nTip: ${lesson.tip || ''}\n`;
        onSaveSupplement && onSaveSupplement(index, { full_guide: fallback });
        setGuideHtml(mdToHtml(fallback));
      }
      setExpanded(true);
    } catch (err) {
      console.error('fetch expansion failed', err);
      const fallback = `### ${lesson.title || `Lesson ${index+1}`}\n\nObjective: ${lesson.title}\n\nTip: ${lesson.tip || ''}\n`;
      setGuideHtml(mdToHtml(fallback));
      setExpanded(true);
    } finally {
      setLoadingExpansion(false);
    }
  }

  async function handleFetchHint() {
    if (lesson.hints && lesson.hints.length > 0 && lesson.hints[0]) {
      setShowHint(s => !s);
      return;
    }
    if (!fetchSupplement) {
      setShowHint(true);
      return;
    }
    try {
      setLoadingHint(true);
      const resp = await fetchSupplement({ type: 'hint', lessonIndex: index, lesson });
      const text = resp && (resp.supplement || resp) ? (resp.supplement || resp) : '';
      if (text && text.trim().length > 0) {
        onSaveSupplement && onSaveSupplement(index, { hints: [text] });
      }
      setShowHint(true);
    } catch (err) {
      console.error('fetch hint failed', err);
      setShowHint(true);
    } finally {
      setLoadingHint(false);
    }
  }

  function showCopied() {
    setCopied(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setCopied(false);
      toastTimerRef.current = null;
    }, 1600);
  }

  function copyText(t) {
    if (!t) { showCopied(); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(() => showCopied()).catch(() => showCopied());
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = t;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showCopied();
      } catch (e) {
        showCopied();
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
    <article className="relative p-3 border rounded shadow-sm bg-white" aria-labelledby={`lesson-${index}-title`}>
      <div aria-hidden className={'absolute top-2 right-2 z-10 pointer-events-none transform transition-all duration-300 ease-in-out ' + (copied ? 'opacity-100 scale-100' : 'opacity-0 scale-95')} style={{ WebkitBackfaceVisibility: 'hidden' }}>
        <div className="bg-black/70 text-white text-xs px-2 py-1 rounded shadow" role="status">Copied!</div>
      </div>

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
            onClick={() => {
              if (lesson.full_guide || lesson.fullGuideText) {
                setExpanded(e => !e);
              } else {
                handleFetchExpansion();
              }
            }}
            className="flex items-center gap-2 px-2 py-1 border rounded text-xs bg-gray-50 hover:bg-gray-100"
            aria-expanded={expanded}
            aria-controls={`lesson-${index}-details`}
            title={expanded ? 'Collapse' : (loadingExpansion ? 'Fetching...' : 'Expand for full guide')}
            disabled={loadingExpansion}
          >
            {expanded ? <IconChevronUp /> : <IconChevronDown />} <span>{expanded ? 'Less' : (loadingExpansion ? 'Loading…' : 'Expand')}</span>
          </button>

          <button
            onClick={() => {
              if (lesson.hints && lesson.hints.length > 0 && lesson.hints[0]) {
                setShowHint(s => !s);
              } else {
                handleFetchHint();
              }
            }}
            className="px-2 py-1 border rounded text-xs bg-yellow-50 hover:bg-yellow-100 flex items-center gap-2"
            title={showHint ? 'Hide hint' : (loadingHint ? 'Fetching hint...' : 'Show hint')}
            aria-pressed={showHint}
            disabled={loadingHint}
          >
            <IconLightbulb /> <span>{loadingHint ? 'Loading…' : 'Hint'}</span>
          </button>

          <button onClick={() => copyText(practice || tip)} className="px-2 py-1 border rounded text-xs bg-gray-50 hover:bg-gray-100 flex items-center gap-2" title="Copy practice text">
            <IconCopy /> <span>Copy</span>
          </button>

          <button onClick={togglePracticed} className={`px-2 py-1 rounded text-xs flex items-center gap-2 ${practiced ? 'bg-green-100 border-green-200' : 'border bg-white'}`} title={practiced ? 'Mark as not practiced' : 'Mark as practiced'} aria-pressed={practiced}>
            <IconCheck /> <span>{practiced ? 'Practiced' : 'Mark'}</span>
          </button>
        </div>
      </div>

      {showHint && (
        <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-gray-800">
          {lesson.hints && lesson.hints.length > 0 ? lesson.hints[0] : (practice ? `Try this: ${practice.split('.').slice(0,1).join('.')} — focus on a single small step.` : 'Try repeating the task twice quickly, focusing on one small part.') }
        </div>
      )}

      {expanded && (
        <div id={`lesson-${index}-details`} className="mt-3 border-t pt-3 text-sm text-gray-800">
          <div className="md-content text-xs" dangerouslySetInnerHTML={{ __html: guideHtml || '<p>No guide available.</p>' }} />
          <div className="flex gap-2 mt-2">
            <button onClick={() => copyText(lesson.full_guide || lesson.fullGuideText || '')} className="px-3 py-1 border rounded text-xs">Copy Guide</button>
            <a href={`mailto:?subject=${encodeURIComponent('MicroSkill practice: ' + title)}&body=${encodeURIComponent((lesson.full_guide || lesson.fullGuideText || '').substring(0,2000))}`} className="px-3 py-1 border rounded text-xs" title="Share via email">Share</a>
          </div>
        </div>
      )}
    </article>
  );
}
