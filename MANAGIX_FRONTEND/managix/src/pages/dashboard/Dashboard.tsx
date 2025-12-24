import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || 'User';

  const handleLogout = () => {
    localStorage.clear(); // Clears token and user data
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome, {userName}!</h1>
            <p className="text-gray-600">Here is what's happening with your projects today.</p>
          </div>
          <button 
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Total Projects</h3>
            <p className="text-3xl font-bold text-black mt-2">12</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Active Tasks</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">24</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Pending Approvals</h3>
            <p className="text-3xl font-bold text-orange-500 mt-2">5</p>
          </div>
        </div>

        {/* Content Placeholder */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 h-64 flex items-center justify-center border-dashed border-2">
          <p className="text-gray-400">Project list and charts will appear here.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;