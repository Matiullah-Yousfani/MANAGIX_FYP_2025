import React from 'react';

const MilestoneSection = ({ milestones, projectId, refresh }: any) => {
  const role = localStorage.getItem('userRole');

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Milestones</h2>
      </div>

      <div className="space-y-6">
        {milestones.length === 0 ? (
          <p className="text-gray-400 text-sm">No milestones created yet.</p>
        ) : (
          milestones.map((m: any) => (
            <div key={m.milestoneId} className="relative">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-bold">{m.title}</span>
                <span className="text-xs font-bold text-gray-500">{m.status}</span>
              </div>
              {/* Simple Progress Bar */}
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${m.status === 'Completed' ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: m.status === 'Completed' ? '100%' : '20%' }}
                ></div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default MilestoneSection;