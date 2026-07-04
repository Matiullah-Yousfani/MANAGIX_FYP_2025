const ASSEMBLY_AI_API_KEY = import.meta.env.VITE_ASSEMBLY_AI_API_KEY || 'bfb72bef9f0642adad5cfa1c1e380945';
const BASE = 'https://api.assemblyai.com/v2';

type Word = { text: string; start: number; end: number };

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/** Groups word timestamps into speaker-labelled lines: [MM:SS] Name: utterance */
export function formatTimestampedTranscript(words: Word[], speakerName: string): string {
  if (!words?.length) return '';

  const lines: string[] = [];
  let buffer = '';
  let lineStart = words[0].start;

  const flush = () => {
    const text = buffer.trim();
    if (text) lines.push(`[${formatMs(lineStart)}] ${speakerName}: ${text}`);
    buffer = '';
  };

  for (const w of words) {
    if (!buffer) lineStart = w.start;
    buffer += (buffer ? ' ' : '') + w.text;

    const endsSentence = /[.!?]$/.test(w.text);
    const longLine = w.end - lineStart >= 12000;
    if (endsSentence || longLine) flush();
  }
  flush();

  return lines.join('\n');
}

export async function transcribeBlob(
  blob: Blob,
  speakerName: string,
  onStatus?: (msg: string) => void
): Promise<string> {
  if (!blob.size) throw new Error('Recording is empty');

  onStatus?.('Uploading recording…');
  const uploadRes = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers: { authorization: ASSEMBLY_AI_API_KEY },
    body: blob,
  });
  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }
  const { upload_url: audioUrl } = await uploadRes.json();

  onStatus?.('Starting transcription…');
  const submitRes = await fetch(`${BASE}/transcript`, {
    method: 'POST',
    headers: {
      authorization: ASSEMBLY_AI_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      punctuate: true,
      format_text: true,
    }),
  });
  if (!submitRes.ok) throw new Error('Failed to start transcription');
  const { id } = await submitRes.json();

  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    onStatus?.(`Transcribing… (${i + 1}/120)`);
    const poll = await fetch(`${BASE}/transcript/${id}`, {
      headers: { authorization: ASSEMBLY_AI_API_KEY },
    });
    if (!poll.ok) throw new Error('Poll failed');
    const data = await poll.json();
    if (data.status === 'completed') {
      const words = (data.words as Word[]) ?? [];
      if (words.length > 0) {
        return formatTimestampedTranscript(words, speakerName);
      }
      const plain = (data.text as string) || '';
      return plain ? `[00:00] ${speakerName}: ${plain}` : '';
    }
    if (data.status === 'error') throw new Error(data.error || 'Transcription error');
  }
  throw new Error('Transcription timed out');
}
