// PHASE 4: Bell-icon notification panel.
//
// Visual: a small button in the top-right of the Layout's main content area.
// Polls /notifications/unread-count every 30s; opens a dropdown with the latest 25.
// Clicking a notification marks it read and (if `link` set) navigates client-side.
// Theme matches MANAGIX: white surface, indigo accent, gray-50 alts, rounded-2xl.
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiCheck, FiCheckCircle, FiVideo, FiUserCheck, FiAlertTriangle, FiFlag, FiZap } from 'react-icons/fi';
import { notificationService } from '../api/notificationService';
import { meetingService } from '../api/meetingService';
import type { NotificationItem, MeetingJoinStatus } from '../types';

const POLL_MS = 30_000;

type Toast = { id: number; title: string; body?: string };

type Props = {
  onOvertimeClick?: (requestId: string, asManager: boolean) => void;
};

const NotificationCenter: React.FC<Props> = ({ onOvertimeClick }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevUnreadRef = useRef(0);
  const userId = localStorage.getItem('userId');
  const ref = useRef<HTMLDivElement>(null);

  const pushToast = (title: string, body?: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev.slice(-2), { id, title, body }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  };

  // PHASE 4: poll unread badge. Cheap endpoint — single COUNT query.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const n = await notificationService.unreadCount(userId);
        if (cancelled) return;
        if (n > prevUnreadRef.current) {
          const list = await notificationService.list(userId, 3);
          const newest = list.find((x) => !x.isRead) ?? list[0];
          if (newest) pushToast(newest.title, newest.body ?? undefined);
        }
        prevUnreadRef.current = n;
        setUnread(n);
      } catch {
        /* swallow — keep last known count */
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [userId]);

  // Fetch the list when the panel is opened.
  const openPanel = async () => {
    setOpen(true);
    if (!userId) return;
    setLoading(true);
    try {
      const list = await notificationService.list(userId, 25);
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Close on outside click.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const parseMeetingId = (link?: string | null): string | null => {
    if (!link) return null;
    const m = link.match(/meetingId=([0-9a-f-]{36})/i);
    return m ? m[1] : null;
  };

  const parseOvertimeId = (link?: string | null): string | null => {
    if (!link) return null;
    const m = link.match(/overtimeId=([0-9a-f-]{36})/i);
    return m ? m[1] : null;
  };

  const onItemClick = async (n: NotificationItem) => {
    if (!userId) return;
    if (!n.isRead) {
      await notificationService.markRead(n.notificationId, userId);
      setItems((prev) => prev.map((x) => (x.notificationId === n.notificationId ? { ...x, isRead: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
    const t = (n.type || '').toLowerCase();
    const oid = parseOvertimeId(n.link);
    if (oid && onOvertimeClick && (t.includes('overtime') || t.includes('explanation'))) {
      setOpen(false);
      onOvertimeClick(oid, t.includes('manager'));
      return;
    }
    const mid = parseMeetingId(n.link);
    if (mid && t.includes('meeting')) {
      try {
        const st = await meetingService.joinStatus(mid, userId);
        if (!st.canJoin) {
          setOpen(false);
          navigate(n.link!);
          return;
        }
      } catch {
        /* fall through */
      }
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const onMeetingJoin = async (n: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const mid = parseMeetingId(n.link);
    if (!mid || !userId) return;
    try {
      const status = await meetingService.joinStatus(mid, userId);
      if (status.canJoin && n.link) {
        setOpen(false);
        navigate(n.link);
      }
    } catch {
      /* ignore */
    }
  };

  const onMarkAll = async () => {
    if (!userId) return;
    await notificationService.markAllRead(userId);
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
  };

  if (!userId) return null; // not logged in

  return (
    <>
    <div className="fixed top-6 right-24 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="pointer-events-auto bg-white border border-indigo-100 shadow-lg rounded-2xl px-4 py-3"
          >
            <p className="text-sm font-black text-gray-900">{t.title}</p>
            {t.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.body}</p>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
    <div className="fixed top-6 right-6 z-40" ref={ref}>
      <button
        onClick={() => (open ? setOpen(false) : openPanel())}
        className="relative bg-white border border-gray-100 shadow-sm rounded-2xl p-3 hover:shadow-md transition-all"
        title="Notifications"
      >
        <FiBell className="text-gray-700" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 size-5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Notifications</h3>
                <p className="text-[10px] font-bold text-gray-400">{unread} unread</p>
              </div>
              {items.some((i) => !i.isRead) && (
                <button onClick={onMarkAll} className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  <FiCheck /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-400 italic">Loading…</div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center">
                  <FiBell className="mx-auto text-gray-200 mb-3" size={32} />
                  <p className="text-sm font-bold text-gray-400 italic">You're all caught up.</p>
                </div>
              ) : (
                items.map((n) => (
                  <MeetingNotificationRow
                    key={n.notificationId}
                    n={n}
                    userId={userId!}
                    onRowClick={() => onItemClick(n)}
                    onJoin={(e) => onMeetingJoin(n, e)}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
};

// PHASE 4: small icon mapping per notification type — keeps the panel scannable.
const NotifIcon: React.FC<{ type: string }> = ({ type }) => {
  const t = type?.toLowerCase() || '';
  if (t.includes('meeting')) return <span className="bg-blue-50 text-blue-600 rounded-xl p-2"><FiVideo /></span>;
  if (t.includes('tasksubmitted') || t.includes('taskassigned') || t.includes('extracted')) return <span className="bg-indigo-50 text-indigo-600 rounded-xl p-2"><FiUserCheck /></span>;
  if (t.includes('workload')) return <span className="bg-orange-50 text-orange-600 rounded-xl p-2"><FiAlertTriangle /></span>;
  if (t.includes('milestone')) return <span className="bg-emerald-50 text-emerald-600 rounded-xl p-2"><FiFlag /></span>;
  if (t.includes('overtime')) return <span className="bg-rose-50 text-rose-600 rounded-xl p-2"><FiAlertTriangle /></span>;
  return <span className="bg-gray-50 text-gray-600 rounded-xl p-2"><FiZap /></span>;
};

const MeetingNotificationRow: React.FC<{
  n: NotificationItem;
  userId: string;
  onRowClick: () => void;
  onJoin: (e: React.MouseEvent) => void;
}> = ({ n, userId, onRowClick, onJoin }) => {
  const isMeeting = (n.type || '').toLowerCase().includes('meeting');
  const meetingId = (n.link || '').match(/meetingId=([0-9a-f-]{36})/i)?.[1] ?? null;
  const [joinState, setJoinState] = React.useState<MeetingJoinStatus | null>(null);

  React.useEffect(() => {
    if (!isMeeting || !meetingId) return;
    const tick = () => meetingService.joinStatus(meetingId, userId).then(setJoinState).catch(() => setJoinState(null));
    tick();
    const ms = joinState?.joinState === 'BeforeStart' || joinState?.joinState === 'Active' ? 10_000 : 30_000;
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [isMeeting, meetingId, userId, joinState?.joinState]);

  const joinDisabled = !joinState?.canJoin;
  const joinLabel =
    joinState?.joinState === 'Expired' ? 'Link removed' :
    joinState?.joinState === 'LinkDisabled' ? 'Window closed' :
    joinState?.joinState === 'BeforeStart' ? 'Join at meeting time' :
    joinState?.canJoin ? 'Join meeting' : 'Join';

  return (
    <button
      onClick={onRowClick}
      className={`w-full text-left px-5 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3 ${!n.isRead ? 'bg-indigo-50/40' : ''}`}
    >
      <NotifIcon type={n.type} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-gray-900 truncate">{n.title}</div>
        {n.body && <div className="text-xs text-gray-500 line-clamp-2">{n.body}</div>}
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
          {new Date(n.createdAt).toLocaleString()}
        </div>
        {isMeeting && meetingId && (
          <button
            type="button"
            disabled={joinDisabled}
            onClick={onJoin}
            className={`mt-2 text-xs font-black px-3 py-1.5 rounded-lg ${
              joinDisabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {joinLabel}
          </button>
        )}
      </div>
      {!n.isRead && <span className="size-2 bg-indigo-600 rounded-full self-start mt-2 shrink-0" />}
    </button>
  );
};

export default NotificationCenter;
