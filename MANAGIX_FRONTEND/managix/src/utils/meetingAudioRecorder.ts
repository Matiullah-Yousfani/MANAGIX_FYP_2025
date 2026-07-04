/** Mixes audio tracks and records to a single WebM blob. */
export class MeetingAudioRecorder {
  private audioContext: AudioContext | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private sources: MediaStreamAudioSourceNode[] = [];
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private started = false;

  start(streams: MediaStream[]) {
    if (this.started) return;
    this.audioContext = new AudioContext();
    this.destination = this.audioContext.createMediaStreamDestination();

    streams.forEach((stream) => {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;
      try {
        const src = this.audioContext!.createMediaStreamSource(stream);
        src.connect(this.destination!);
        this.sources.push(src);
      } catch {
        /* track may already be consumed */
      }
    });

    const out = this.destination.stream;
    if (out.getAudioTracks().length === 0) {
      throw new Error('No audio tracks available to record');
    }

    let mime = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mime)) mime = 'audio/webm';

    this.chunks = [];
    this.recorder = new MediaRecorder(out, { mimeType: mime });
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start(1000);
    this.started = true;
  }

  addStream(stream: MediaStream) {
    if (!this.started || !this.audioContext || !this.destination) return;
    if (stream.getAudioTracks().length === 0) return;
    try {
      const src = this.audioContext.createMediaStreamSource(stream);
      src.connect(this.destination);
      this.sources.push(src);
    } catch {
      /* ignore */
    }
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.recorder || this.recorder.state === 'inactive') {
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        this.cleanup();
        resolve(blob);
        return;
      }
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.recorder?.mimeType || 'audio/webm' });
        this.cleanup();
        resolve(blob);
      };
      this.recorder.onerror = () => reject(new Error('Recorder error'));
      this.recorder.stop();
    });
  }

  private cleanup() {
    this.sources.forEach((s) => {
      try { s.disconnect(); } catch { /* */ }
    });
    this.sources = [];
    if (this.audioContext?.state !== 'closed') {
      this.audioContext?.close();
    }
    this.audioContext = null;
    this.destination = null;
    this.recorder = null;
    this.started = false;
  }
}
