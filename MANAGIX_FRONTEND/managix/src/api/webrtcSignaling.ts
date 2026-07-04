import api from './axiosInstance';

export type WebRtcSignal = {
  id: string;
  fromUserId: string;
  toUserId?: string | null;
  type: string;
  payload: string;
  createdAt: string;
};

export type WebRtcPeer = {
  userId: string;
  userName: string;
  lastSeen: string;
};

const roomPath = (roomId: string) => encodeURIComponent(roomId);

export const webrtcSignaling = {
  post: async (
    meetingId: string,
    body: { fromUserId: string; toUserId?: string; type: string; payload: string }
  ) => {
    await api.post(`/meetings/${roomPath(meetingId)}/webrtc/signal`, body);
  },

  poll: async (meetingId: string, userId: string, sinceIso: string): Promise<WebRtcSignal[]> => {
    const r = await api.get(`/meetings/${roomPath(meetingId)}/webrtc/signals`, {
      params: { userId, since: sinceIso },
    });
    return r.data ?? [];
  },

  peers: async (meetingId: string): Promise<WebRtcPeer[]> => {
    const r = await api.get(`/meetings/${roomPath(meetingId)}/webrtc/peers`);
    return r.data ?? [];
  },
};

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};
