import React, { useState } from 'react';
import { milestoneService } from '../api/milestoneService';
import { isMilestoneCompleted } from '../api/normalize';

const MilestoneSection = ({ milestones, projectId, refresh }: any) => {
  const role = localStorage.getItem('roleName') || localStorage.getItem('userRole');
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleComplete = async (m: any) => {
    const id = m.milestoneId || m.MilestoneId;
    if (!id || !window.confirm(`Mark "${m.title || m.Title}" as completed?`)) return;
    setBusyId(id);
    try {
      await milestoneService.close(id, { comment: 'Completed' });
      await refresh?.();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Could not mark milestone as completed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Milestones</h2>
      </div>

      <div className="space-y-6">
        {milestones.length === 0 ? (
          <p className="text-gray-400 text-sm">No milestones created yet.</p>
        ) : (
          milestones.map((m: any) => {
            const status = m.status || m.Status || '';
            const completed = isMilestoneCompleted(status);
            const id = m.milestoneId || m.MilestoneId;
            return (
              <div key={id} className="relative">
                <div className="flex justify-between mb-1 items-center gap-2">
                  <span className="text-sm font-bold">{m.title || m.Title}</span>
                  <span className={`text-xs font-bold ${completed ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {status || 'Pending'}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${completed ? 'bg-emerald-500 w-full' : 'bg-blue-500 w-1/3'}`}
                  />
                </div>
                {role === 'Manager' && !completed && (
                  <button
                    type="button"
                    disabled={busyId === id}
                    onClick={() => handleComplete(m)}
                    className="mt-2 text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                  >
                    {busyId === id ? 'Saving…' : 'Mark completed'}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MilestoneSection;
