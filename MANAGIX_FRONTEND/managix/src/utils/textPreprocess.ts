/** Clean project descriptions before sending to AI (reduces payload failures). */
export function preprocessTextForAi(text: string, maxChars = 12000): string {
  if (!text?.trim()) return '';

  let cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line, i, arr) => line.length > 0 && line !== arr[i - 1])
    .join('\n')
    .trim();

  if (cleaned.length > maxChars) {
    const head = cleaned.slice(0, Math.floor(maxChars * 0.7));
    const tail = cleaned.slice(-Math.floor(maxChars * 0.25));
    cleaned = `${head}\n\n[… middle section trimmed for AI …]\n\n${tail}`;
  }

  return cleaned.slice(0, maxChars);
}
