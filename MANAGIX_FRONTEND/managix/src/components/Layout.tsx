import React from 'react';
import Sidebar from './Sidebar';
// PHASE 4: bell-icon notification panel anchored top-right of every protected page.
import NotificationCenter from './NotificationCenter';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-64 w-full min-h-screen bg-gray-50 p-8 relative">
        {/* PHASE 4: floating bell — does not affect existing page layouts. */}
        <NotificationCenter />
        {children}
      </main>
    </div>
  );
};

export default Layout;