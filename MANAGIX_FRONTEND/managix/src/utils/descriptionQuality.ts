/** Semantic description quality — mirrors backend DescriptionQuality.cs */

export const MIN_DISTINCT_WORDS = 35;

export function validateDescriptionQuality(description: string): string | null {
  const desc = (description ?? '').trim();
  if (desc.length < 200) return null; // length handled by validateProjectStep1

  const lower = desc.toLowerCase();
  if (/lorem\s+ipsum|asdf{3,}|test\s+test\s+test|xxxx+|aaaa+|qwerty|keyboard\s+test/.test(lower)) {
    return 'Description looks like placeholder or filler text. Describe a real project with goals and deliverables.';
  }

  const words = desc.split(/\W+/).filter((w) => w.length > 2);
  if (words.length < MIN_DISTINCT_WORDS) {
    return `Description needs at least ${MIN_DISTINCT_WORDS} meaningful words (found ${words.length}).`;
  }

  const distinct = new Set(words.map((w) => w.toLowerCase())).size;
  if (distinct < MIN_DISTINCT_WORDS) {
    return `Use more varied vocabulary — at least ${MIN_DISTINCT_WORDS} distinct words (found ${distinct}).`;
  }

  const counts = new Map<string, number>();
  for (const w of words) {
    const k = w.toLowerCase();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let topWord = '';
  let topCount = 0;
  counts.forEach((c, w) => {
    if (c > topCount) {
      topCount = c;
      topWord = w;
    }
  });
  if (topCount > Math.max(8, Math.floor(words.length * 0.12))) {
    return `The word "${topWord}" is repeated too often. Write a substantive project brief.`;
  }

  if (!/[.!?]/.test(desc)) {
    return 'Write full sentences covering goals, users or stakeholders, scope, and expected outcomes.';
  }

  return null;
}
