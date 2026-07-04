import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Users, Circle,
  Loader2, Download, FileText, Sparkles,
} from 'lucide-react';
import { ICE_SERVERS, webrtcSignaling } from '../api/webrtcSignaling';
import { MeetingAudioRecorder } from '../utils/meetingAudioRecorder';
import { transcribeBlob } from '../utils/assemblyAiTranscript';
import { meetingService } from '../api/meetingService';

export type ParticipantTile = {
  id: string;
  name: string;
  stream?: MediaStream;
  isLocal: boolean;
  videoEnabled: boolean;
  audioEnabled: boolean;
  status: 'joined' | 'not_joined' | 'connecting';
};

type RosterMember = { userId: string; userName: string; role?: string };

type Props = {
  roomId: string;
  meetingTitle: string;
  scheduledMeetingId?: string | null;
  projectId?: string | null;
  onLeave?: () => void;
  onOpenTaskExtractor?: (transcript: string) => void;
};

const WebRtcMeetingRoom: React.FC<Props> = ({
  roomId,
  meetingTitle,
  scheduledMeetingId,
  projectId,
  onLeave,
  onOpenTaskExtractor,
}) => {
  const userId = localStorage.getItem('userId') || '';
  const userName = localStorage.getItem('userName') || 'You';

  const [phase, setPhase] = useState<'lobby' | 'connecting' | 'live' | 'ended'>('lobby');
  const [tiles, setTiles] = useState<ParticipantTile[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{
    combinedSummary?: string;
    meetingNotes?: string;
    combinedTranscript?: string;
    backlogItems?: Array<{ title: string; description?: string; priority?: string }>;
    tasks?: unknown[];
  } | null>(null);
  const [peerCount, setPeerCount] = useState(0);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const peerNamesRef = useRef<Map<string, string>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const makingOfferRef = useRef<Set<string>>(new Set());
  const pollSinceRef = useRef(new Date().toISOString());
  const recorderRef = useRef<MeetingAudioRecorder | null>(null);
  const joinedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const rebuildTiles = useCallback(() => {
    if (roster.length > 0) {
      const list: ParticipantTile[] = roster.map((p) => {
        const id = p.userId;
        const isLocal = id === userId;
        const stream = isLocal
          ? localStreamRef.current ?? undefined
          : remoteStreamsRef.current.get(id);
        const hasActiveStream = !!stream && (
          stream.getVideoTracks().some((t) => t.readyState === 'live')
          || stream.getAudioTracks().some((t) => t.readyState === 'live')
        );
        const isOnline = onlineIds.has(id);

        let status: ParticipantTile['status'] = 'not_joined';
        if (hasActiveStream) status = 'joined';
        else if (isOnline) status = 'connecting';

        return {
          id,
          name: isLocal ? `${p.userName} (You)` : p.userName,
          stream,
          isLocal,
          videoEnabled: hasActiveStream
            ? (isLocal ? (camOn || screenSharing) : stream!.getVideoTracks().some((t) => t.enabled))
            : false,
          audioEnabled: hasActiveStream ? stream!.getAudioTracks().some((t) => t.enabled) : false,
          status,
        };
      });
      setTiles(list);
      setPeerCount(list.filter((t) => t.status === 'joined').length);
      return;
    }

    const list: ParticipantTile[] = [];
    const local = localStreamRef.current;
    if (local) {
      list.push({
        id: userId,
        name: `${userName} (You)`,
        stream: local,
        isLocal: true,
        videoEnabled: camOn || screenSharing,
        audioEnabled: micOn,
        status: 'joined',
      });
    }
    remoteStreamsRef.current.forEach((stream, id) => {
      list.push({
        id,
        name: peerNamesRef.current.get(id) || 'Participant',
        stream,
        isLocal: false,
        videoEnabled: stream.getVideoTracks().some((t) => t.enabled),
        audioEnabled: stream.getAudioTracks().some((t) => t.enabled),
        status: 'joined',
      });
    });
    setTiles(list);
    setPeerCount(list.length);
  }, [roster, onlineIds, userId, userName, camOn, micOn, screenSharing]);

  const postSignal = async (type: string, payload: unknown, toUserId?: string) => {
    await webrtcSignaling.post(roomId, {
      fromUserId: userId,
      toUserId,
      type,
      payload: JSON.stringify(payload),
    });
  };

  const getOrCreatePc = (remoteId: string): RTCPeerConnection => {
    let pc = peersRef.current.get(remoteId);
    if (pc) return pc;

    pc = new RTCPeerConnection(ICE_SERVERS);
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => pc!.addTrack(t, stream));
    }

    pc.ontrack = (ev) => {
      const rs = ev.streams[0];
      if (rs) {
        remoteStreamsRef.current.set(remoteId, rs);
        recorderRef.current?.addStream(rs);
        rebuildTiles();
      }
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        postSignal('ice', ev.candidate.toJSON(), remoteId).catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc!.connectionState === 'failed' || pc!.connectionState === 'closed') {
        remoteStreamsRef.current.delete(remoteId);
        peersRef.current.delete(remoteId);
        rebuildTiles();
      }
    };

    peersRef.current.set(remoteId, pc);
    return pc;
  };

  const handleSignal = async (sig: {
    fromUserId: string;
    type: string;
    payload: string;
  }) => {
    const from = sig.fromUserId;
    if (from === userId) return;

    let data: any;
    try {
      data = JSON.parse(sig.payload || '{}');
    } catch {
      data = {};
    }

    if (sig.type === 'join') {
      const rname = data.userName || 'Participant';
      peerNamesRef.current.set(from, rname);
      if (userId < from && !makingOfferRef.current.has(from)) {
        makingOfferRef.current.add(from);
        const pc = getOrCreatePc(from);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await postSignal('offer', offer, from);
      }
      rebuildTiles();
    } else if (sig.type === 'offer') {
      peerNamesRef.current.set(from, data.userName || peerNamesRef.current.get(from) || 'Participant');
      const pc = getOrCreatePc(from);
      await pc.setRemoteDescription(new RTCSessionDescription(data));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await postSignal('answer', answer, from);
    } else if (sig.type === 'answer') {
      const pc = peersRef.current.get(from);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data));
    } else if (sig.type === 'ice') {
      const pc = peersRef.current.get(from);
      if (pc && data) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data));
        } catch {
          /* ignore stale ice */
        }
      }
    } else if (sig.type === 'leave') {
      const pc = peersRef.current.get(from);
      pc?.close();
      peersRef.current.delete(from);
      remoteStreamsRef.current.delete(from);
      peerNamesRef.current.delete(from);
      rebuildTiles();
    }
  };

  const joinMeeting = async () => {
    setPhase('connecting');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      rebuildTiles();

      await postSignal('join', { userId, userName });
      joinedRef.current = true;

      recorderRef.current = new MeetingAudioRecorder();
      // Transcript uses local microphone only — tagged with this user's session name.
      const localAudio = new MediaStream(stream.getAudioTracks());
      recorderRef.current.start([localAudio]);
      setRecording(true);

      setPhase('live');
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

      const poll = setInterval(async () => {
        try {
          const since = pollSinceRef.current;
          pollSinceRef.current = new Date().toISOString();
          const signals = await webrtcSignaling.poll(roomId, userId, since);
          for (const s of signals) await handleSignal(s);
        } catch {
          /* swallow poll errors */
        }
      }, 1200);

      (joinMeeting as any)._pollId = poll;
    } catch (err: any) {
      setError(err?.message || 'Could not access camera/microphone');
      setPhase('lobby');
    }
  };

  const leaveMeeting = async () => {
    if ((joinMeeting as any)._pollId) clearInterval((joinMeeting as any)._pollId);
    if (timerRef.current) clearInterval(timerRef.current);

    setPhase('ended');
    setProcessing('Stopping recording…');

    try {
      await postSignal('leave', {});
    } catch {
      /* ignore */
    }

    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();

    let blob: Blob | null = null;
    if (recorderRef.current) {
      try {
        blob = await recorderRef.current.stop();
      } catch {
        blob = null;
      }
    }

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current = null;
    setRecording(false);

    if (blob && blob.size > 0) {
      try {
        setProcessing('Generating AI transcript…');
        const displayName = userName.replace(/\s*\(You\)\s*/i, '').trim() || 'Participant';
        const text = await transcribeBlob(blob, displayName, setProcessing);
        setTranscript(text);
        setProcessing(null);
        if (scheduledMeetingId && userId && text?.trim()) {
          await meetingService.saveParticipantTranscript(scheduledMeetingId, userId, text);
          setProcessing('Building combined meeting transcript…');
          const finalized = await meetingService.tryFinalize(scheduledMeetingId, userId);
          if (finalized) {
            setAnalysis(finalized);
            if (finalized.combinedTranscript) setTranscript(finalized.combinedTranscript);
          }
          setProcessing(null);
        }
      } catch (err: any) {
        setError(err?.message || 'Transcription failed');
        setProcessing(null);
      }
    } else {
      setProcessing(null);
      setError('No audio was recorded.');
    }

    onLeave?.();
  };

  useEffect(() => {
    if (!scheduledMeetingId) return;
    meetingService.getParticipantRoster(scheduledMeetingId)
      .then((list) => {
        const normalized = (list ?? []).map((p: any) => ({
          userId: String(p.userId ?? p.UserId),
          userName: p.userName ?? p.UserName ?? 'Participant',
          role: p.role ?? p.Role,
        }));
        setRoster(normalized);
      })
      .catch(() => setRoster([]));
  }, [scheduledMeetingId]);

  useEffect(() => {
    if (phase !== 'live') return;

    let cancelled = false;
    const refreshOnline = async () => {
      const ids = new Set<string>();
      if (joinedRef.current) ids.add(userId);
      try {
        const peers = await webrtcSignaling.peers(roomId);
        peers.forEach((p) => ids.add(p.userId));
      } catch {
        /* ignore */
      }
      if (!cancelled) setOnlineIds(ids);
    };

    refreshOnline();
    const interval = setInterval(refreshOnline, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [phase, roomId, userId]);

  useEffect(() => {
    rebuildTiles();
  }, [roster, onlineIds, phase, rebuildTiles]);

  useEffect(() => {
    return () => {
      if (joinedRef.current) {
        postSignal('leave', {}).catch(() => {});
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        peersRef.current.forEach((pc) => pc.close());
      }
    };
  }, []);

  const toggleMic = () => {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (t) {
      t.enabled = !t.enabled;
      setMicOn(t.enabled);
      rebuildTiles();
    }
  };

  const toggleCam = () => {
    const t = localStreamRef.current?.getVideoTracks()[0];
    if (t) {
      t.enabled = !t.enabled;
      setCamOn(t.enabled);
      rebuildTiles();
    }
  };

  const toggleScreen = async () => {
    if (screenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setScreenSharing(false);
      const cam = await navigator.mediaDevices.getUserMedia({ video: true });
      const vt = cam.getVideoTracks()[0];
      const local = localStreamRef.current;
      if (local) {
        const old = local.getVideoTracks()[0];
        if (old) local.removeTrack(old);
        local.addTrack(vt);
        peersRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          sender?.replaceTrack(vt);
        });
      }
      rebuildTiles();
      return;
    }
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = screen;
      const st = screen.getVideoTracks()[0];
      st.onended = () => toggleScreen();
      const local = localStreamRef.current;
      if (local) {
        const old = local.getVideoTracks()[0];
        if (old) local.removeTrack(old);
        local.addTrack(st);
        recorderRef.current?.addStream(screen);
        peersRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          sender?.replaceTrack(st);
        });
      }
      setScreenSharing(true);
      rebuildTiles();
    } catch {
      /* user cancelled */
    }
  };

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const gridCount = roster.length > 0 ? roster.length : tiles.length;
  const gridClass =
    gridCount <= 1
      ? 'grid-cols-1'
      : gridCount === 2
        ? 'grid-cols-2'
        : gridCount <= 4
          ? 'grid-cols-2'
          : gridCount <= 6
            ? 'grid-cols-3'
            : 'grid-cols-4';
  const joinedCount = tiles.filter((t) => t.status === 'joined').length;
  const totalCount = roster.length > 0 ? roster.length : Math.max(tiles.length, 1);

  if (phase === 'lobby') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-bg rounded-xl">
        <div className="text-center max-w-md px-8">
          <div className="w-20 h-20 rounded-full bg-surface-2 mx-auto mb-6 flex items-center justify-center">
            <Video className="text-fg" size={36} />
          </div>
          <h2 className="text-2xl font-semibold text-fg mb-2">{meetingTitle}</h2>
          <p className="text-fg-muted text-sm mb-8">MANAGIX Video — secure WebRTC call</p>
          {error && <p className="text-danger text-sm mb-4">{error}</p>}
          <button
            type="button"
            onClick={joinMeeting}
            className="bg-primary hover:bg-primary-hover text-primary-fg font-medium px-10 py-3 rounded-full text-lg transition-colors"
          >
            Join now
          </button>
          <p className="text-xs text-fg-muted mt-6">Camera and microphone will be requested. Recording starts automatically.</p>
        </div>
      </div>
    );
  }

  if (phase === 'connecting') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-bg rounded-xl">
        <div className="text-center text-fg">
          <Loader2 className="animate-spin mx-auto mb-4" size={40} />
          <p>Connecting to meeting…</p>
        </div>
      </div>
    );
  }

  if (phase === 'ended') {
    return (
      <div className="space-y-6">
        <div className="bg-bg rounded-xl p-10 text-center text-fg">
          <h2 className="text-xl font-semibold mb-2">You left the meeting</h2>
          {processing && (
            <p className="text-fg-muted flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={18} /> {processing}
            </p>
          )}
          {error && <p className="text-danger mt-2">{error}</p>}
        </div>
        {transcript && (
          <div className="bg-surface rounded-xl border border-line p-8 shadow-e1 space-y-6">
            {analysis?.combinedSummary && (
              <div className="bg-primary-soft rounded-xl p-5 border border-primary-border">
                <h3 className="text-sm font-bold uppercase text-primary tracking-widest mb-2">Meeting summary</h3>
                <p className="text-fg text-sm">{analysis.combinedSummary}</p>
              </div>
            )}
            {analysis?.meetingNotes && (
              <div className="bg-warning-soft rounded-xl p-5 border border-warning/25">
                <h3 className="text-sm font-bold uppercase text-warning tracking-widest mb-2">Meeting notes</h3>
                <pre className="whitespace-pre-wrap text-sm text-fg-muted">{analysis.meetingNotes}</pre>
              </div>
            )}
            {analysis?.backlogItems && analysis.backlogItems.length > 0 && (
              <div className="bg-surface-2 rounded-xl p-5 border border-line">
                <h3 className="text-sm font-bold uppercase text-fg-muted tracking-widest mb-3">Backlog items</h3>
                <ul className="space-y-2 text-sm">
                  {analysis.backlogItems.map((b, i) => (
                    <li key={i} className="bg-surface rounded-lg px-3 py-2 border border-line">
                      <span className="font-bold text-fg">{b.title}</span>
                      {b.priority && <span className="ml-2 text-xs text-primary font-bold">{b.priority}</span>}
                      {b.description && <p className="text-fg-muted mt-1">{b.description}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-fg flex items-center gap-2">
                <FileText size={20} /> {analysis?.combinedTranscript ? 'Combined transcript' : 'Your transcript'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([transcript], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `transcript-${roomId.slice(0, 8)}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                <Download size={16} /> Download
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-fg-muted bg-surface-2 rounded-xl p-5 max-h-80 overflow-y-auto border border-line">
              {transcript}
            </pre>
            {onOpenTaskExtractor && (
              <button
                type="button"
                onClick={() => onOpenTaskExtractor(transcript)}
                className="mt-4 flex items-center gap-2 bg-success hover:bg-success text-primary-fg px-6 py-3 rounded-lg font-semibold text-sm"
              >
                <Sparkles size={18} /> Review AI tasks
              </button>
            )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-bg rounded-xl overflow-hidden min-h-[75vh] shadow-e3">
      {/* Top bar — Google Meet style */}
      <div className="flex items-center justify-between px-6 py-3 bg-surface-2 border-b border-line">
        <div className="flex items-center gap-4">
          <span className="text-fg font-medium truncate max-w-xs">{meetingTitle}</span>
          <span className="text-fg-muted text-sm font-mono">{formatElapsed(elapsed)}</span>
          {recording && (
            <span className="flex items-center gap-1.5 text-danger text-xs font-semibold uppercase tracking-wide">
              <Circle size={8} fill="currentColor" className="animate-pulse" /> Rec
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-fg-muted text-sm">
          <Users size={16} />
          <span>{joinedCount} / {totalCount} joined</span>
        </div>
      </div>

      {/* Video grid */}
      <div className={`flex-1 p-4 grid ${gridClass} gap-3 auto-rows-fr min-h-[50vh]`}>
        {tiles.map((tile) => (
          <VideoTile key={tile.id} tile={tile} />
        ))}
        {tiles.length === 0 && (
          <div className="col-span-full flex items-center justify-center text-fg-muted">
            Waiting for participants…
          </div>
        )}
      </div>

      {/* Bottom toolbar — Zoom/Meet style */}
      <div className="flex items-center justify-center gap-3 py-5 px-6 bg-surface-2 border-t border-line">
        <ToolbarBtn
          active={micOn}
          onClick={toggleMic}
          icon={micOn ? <Mic size={22} /> : <MicOff size={22} />}
          label={micOn ? 'Mute' : 'Unmute'}
          danger={!micOn}
        />
        <ToolbarBtn
          active={camOn}
          onClick={toggleCam}
          icon={camOn ? <Video size={22} /> : <VideoOff size={22} />}
          label={camOn ? 'Stop video' : 'Start video'}
          danger={!camOn}
        />
        <ToolbarBtn
          active={screenSharing}
          onClick={toggleScreen}
          icon={<MonitorUp size={22} />}
          label="Present"
          highlight={screenSharing}
        />
        <button
          type="button"
          onClick={leaveMeeting}
          className="flex flex-col items-center gap-1 mx-4"
          title="Leave call"
        >
          <span className="w-14 h-14 rounded-full bg-danger hover:bg-danger flex items-center justify-center text-white transition-colors">
            <PhoneOff size={24} />
          </span>
          <span className="text-[10px] text-fg-muted">Leave</span>
        </button>
      </div>
    </div>
  );
};

const VideoTile: React.FC<{ tile: ParticipantTile }> = ({ tile }) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !tile.stream) return;
    el.srcObject = tile.stream;
    el.play().catch(() => {});
  }, [tile.stream]);

  const showVideo = tile.status === 'joined'
    && tile.videoEnabled
    && !!tile.stream
    && tile.stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live');

  const initial = (tile.name || '?').replace(/\s*\(You\)\s*/i, '').charAt(0).toUpperCase();

  if (tile.status === 'not_joined') {
    return (
      <div className="relative bg-[#2d2e30] rounded-xl overflow-hidden aspect-video flex flex-col items-center justify-center border border-dashed border-[#5f6368]">
        <div className="w-16 h-16 rounded-full bg-[#3c4043] flex items-center justify-center text-xl font-semibold text-[#9aa0a6]">
          {initial}
        </div>
        <span className="text-[#9aa0a6] text-xs mt-3 font-medium">Not joined yet</span>
        <div className="absolute bottom-2 left-2">
          <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-md font-medium truncate max-w-[140px]">
            {tile.name}
          </span>
        </div>
      </div>
    );
  }

  if (tile.status === 'connecting') {
    return (
      <div className="relative bg-[#3c4043] rounded-xl overflow-hidden aspect-video flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-[#5f6368] flex items-center justify-center text-xl font-semibold text-white">
          {initial}
        </div>
        <span className="text-[#9aa0a6] text-xs mt-3 flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" /> Connecting…
        </span>
        <div className="absolute bottom-2 left-2">
          <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-md font-medium truncate max-w-[140px]">
            {tile.name}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-[#3c4043] rounded-xl overflow-hidden aspect-video flex items-center justify-center">
      {showVideo ? (
        <video ref={ref} autoPlay playsInline muted={tile.isLocal} className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full bg-[#5f6368] flex items-center justify-center text-2xl font-semibold text-white">
            {initial}
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-2">
        <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-md font-medium truncate max-w-[140px]">
          {tile.name}
        </span>
        {!tile.audioEnabled && <MicOff size={14} className="text-red-400" />}
      </div>
    </div>
  );
};

const ToolbarBtn: React.FC<{
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  highlight?: boolean;
}> = ({ onClick, icon, label, danger, highlight }) => (
  <button type="button" onClick={onClick} className="flex flex-col items-center gap-1 group" title={label}>
    <span
      className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors ${
        highlight
          ? 'bg-primary'
          : danger
            ? 'bg-danger hover:bg-danger'
            : 'bg-surface-3 hover:bg-surface-3'
      }`}
    >
      {icon}
    </span>
    <span className="text-[10px] text-fg-muted group-hover:text-fg">{label}</span>
  </button>
);

export default WebRtcMeetingRoom;
