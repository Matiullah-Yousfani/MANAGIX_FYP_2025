import { useCallback, useEffect, useState } from 'react';
import { meetingService } from '../api/meetingService';
import type { Meeting } from '../types';

export function useActiveMeetings(pollMs = 25_000) {
  const userId = localStorage.getItem('userId') || '';
  const [active, setActive] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setActive([]);
      setLoading(false);
      return;
    }
    try {
      const list = await meetingService.activeForUser(userId);
      setActive(Array.isArray(list) ? list : []);
    } catch {
      setActive([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { active, loading, refresh, hasActive: active.length > 0 };
}
