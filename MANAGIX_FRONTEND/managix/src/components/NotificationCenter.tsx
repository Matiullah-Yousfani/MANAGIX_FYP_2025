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
import type { NotificationItem } from '../types';

const POLL_MS = 30_000;

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const userId = localStorage.getItem('userId');
  const ref = useRef<HTMLDivElement>(null);

  // PHASE 4: poll unread badge. Cheap endpoint — single COUNT query.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const n = await notificationService.unreadCount(userId);
        if (!cancelled) setUnread(n);
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

  const onItemClick = async (n: NotificationItem) => {
    if (!userId) return;
    if (!n.isRead) {
      await notificationService.markRead(n.notificationId, userId);
      setItems((prev) => prev.map((x) => (x.notificationId === n.notificationId ? { ...x, isRead: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
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
                  <button
                    key={n.notificationId}
                    onClick={() => onItemClick(n)}
                    className={`w-full text-left px-5 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3 ${!n.isRead ? 'bg-indigo-50/40' : ''}`}
                  >
                    <NotifIcon type={n.type} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">{n.title}</div>
                      {n.body && <div className="text-xs text-gray-500 line-clamp-2">{n.body}</div>}
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {!n.isRead && <span className="size-2 bg-indigo-600 rounded-full self-start mt-2 shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// PHASE 4: small icon mapping per notification type — keeps the panel scannable.
const NotifIcon: React.FC<{ type: string }> = ({ type }) => {
  const t = type?.toLowerCase() || '';
  if (t.includes('meeting')) return <span className="bg-blue-50 text-blue-600 rounded-xl p-2"><FiVideo /></span>;
  if (t.includes('taskassigned') || t.includes('extracted')) return <span className="bg-indigo-50 text-indigo-600 rounded-xl p-2"><FiUserCheck /></span>;
  if (t.includes('workload')) return <span className="bg-orange-50 text-orange-600 rounded-xl p-2"><FiAlertTriangle /></span>;
  if (t.includes('milestone')) return <span className="bg-emerald-50 text-emerald-600 rounded-xl p-2"><FiFlag /></span>;
  return <span className="bg-gray-50 text-gray-600 rounded-xl p-2"><FiZap /></span>;
};

export default NotificationCenter;
