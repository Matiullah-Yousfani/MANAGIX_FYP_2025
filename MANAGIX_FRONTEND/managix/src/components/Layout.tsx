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
    <div className="flex bg-bg min-h-screen">
      <Sidebar />
      <main className="ml-64 w-full min-h-screen bg-bg text-fg p-6 relative">
        <div className="max-w-7xl mx-auto">
          <NotificationCenter />
          <TodayMeetingBanner />
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
