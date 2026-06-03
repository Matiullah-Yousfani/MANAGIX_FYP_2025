import React, { useEffect, useState } from 'react';
import { timesheetService } from '../../api/timesheetService';

const TimesheetsPage: React.FC = () => {
  const userId = localStorage.getItem('userId') || '';
  const role = (localStorage.getItem('roleName') || localStorage.getItem('userRole') || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        setRows(await timesheetService.listAdmin());
      } else if (isManager && userId) {
        setRows(await timesheetService.listManager(userId));
      } else {
        setRows([]);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const review = async (id: string, approve: boolean) => {
    try {
      await timesheetService.reviewDaily(id, { approve, managerComment: comment || undefined });
      setComment('');
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Review failed');
    }
  };

  if (!isAdmin && !isManager) {
    return (
      <div className="p-12 text-center text-gray-500">
        Managers and admins can review submitted timesheets here.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Team timesheets</h1>
      <p className="text-gray-500 mb-8">
        {isAdmin ? 'All submitted daily timesheets.' : 'Your timesheets and your project team members.'}
      </p>
      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-400 italic">No timesheet submissions yet.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const id = r.dailyTimesheetId ?? r.DailyTimesheetId;
            const st = r.status ?? r.Status;
            return (
              <div key={id} className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="font-black text-gray-900">{r.fullName ?? r.FullName}</p>
                    <p className="text-xs text-gray-400">
                      {String(r.workDate ?? r.WorkDate).slice(0, 10)} · {r.totalHours ?? r.TotalHours}h ·{' '}
                      <span className="uppercase font-bold">{st}</span>
                    </p>
                    {r.overtimeReason && (
                      <p className="text-sm text-amber-700 mt-2">Overtime: {r.overtimeReason}</p>
                    )}
                    {r.employeeNote && <p className="text-sm text-gray-600 mt-1">{r.employeeNote}</p>}
                  </div>
                  {st === 'Submitted' && String(r.userId ?? r.UserId) !== userId && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <input
                        type="text"
                        placeholder="Comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="border rounded-lg px-2 py-1 text-xs"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => review(id, true)}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-black"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => review(id, false)}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-black"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TimesheetsPage;
