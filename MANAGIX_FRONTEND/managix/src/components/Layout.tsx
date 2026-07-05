import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import NotificationCenter from './NotificationCenter';
import TodayMeetingBanner from './TodayMeetingBanner';
import { timesheetService } from '../api/timesheetService';

const Layout = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    const ping = () => timesheetService.heartbeat(userId).catch(() => {});
    ping();
    const id = setInterval(ping, 120_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex">
      <Sidebar />
      <main className="bg-aurora ml-64 w-full min-h-screen bg-slate-100 p-8 relative">
        <NotificationCenter />
        <TodayMeetingBanner />
        {children}
      </main>
    </div>
  );
};

export default Layout;
