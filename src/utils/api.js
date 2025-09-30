export async function generateMicroContent({ jobTitle, skillLevel, strengths, platform, jobDesc, provider }) {
  const DEFAULT_PROVIDER = import.meta.env.VITE_DEFAULT_PROVIDER || 'openai';
  const chosenProvider = (provider || DEFAULT_PROVIDER).toLowerCase();

  const FUNCTION_PATH = import.meta.env.VITE_FUNCTION_PATH || '/api/generate';

  const res = await fetch(FUNCTION_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobTitle, skillLevel, strengths, platform, jobDesc, provider: chosenProvider })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (data?.error && !data.micro_lessons) {
    throw new Error(data.error || 'Generation failed');
  }
  return data;
}
