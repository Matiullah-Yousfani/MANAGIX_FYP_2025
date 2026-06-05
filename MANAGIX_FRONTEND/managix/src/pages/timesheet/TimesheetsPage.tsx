import React, { useEffect, useMemo, useState } from 'react';
import { timesheetService } from '../../api/timesheetService';

const TimesheetsPage: React.FC = () => {
  const userId = localStorage.getItem('userId') || '';
  const role = (localStorage.getItem('roleName') || localStorage.getItem('userRole') || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const st = String(r.status ?? r.Status ?? '').toLowerCase();
      if (statusFilter !== 'all' && st !== statusFilter) return false;
      if (!q) return true;
      const name = String(r.fullName ?? r.FullName ?? '').toLowerCase();
      const email = String(r.email ?? r.Email ?? '').toLowerCase();
      const date = String(r.workDate ?? r.WorkDate ?? '').slice(0, 10);
      return name.includes(q) || email.includes(q) || date.includes(q);
    });
  }, [rows, statusFilter, search]);

  const canReview = (r: any) => {
    const st = r.status ?? r.Status;
    if (st !== 'Submitted') return false;
    const rowUserId = String(r.userId ?? r.UserId ?? '');
    if (rowUserId === userId) return false;
    const submitterRole = String(r.submitterRole ?? r.SubmitterRole ?? '').toLowerCase();
    if (submitterRole === 'manager' && !isAdmin) return false;
    return isAdmin || isManager;
  };

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
      <p className="text-gray-500 mb-6">
        {isAdmin
          ? 'All submitted daily timesheets. Manager submissions require admin approval.'
          : 'Your team members’ timesheets. Your own submissions go to admin for approval.'}
      </p>

      <div className="flex flex-wrap gap-3 mb-8">
        <input
          type="search"
          placeholder="Search name, email, or date…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium flex-1 min-w-[200px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold"
        >
          <option value="all">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 italic">No timesheet submissions match your filters.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => {
            const id = r.dailyTimesheetId ?? r.DailyTimesheetId;
            const st = r.status ?? r.Status;
            const submitterRole = r.submitterRole ?? r.SubmitterRole;
            const needsAdmin = String(submitterRole ?? '').toLowerCase() === 'manager';
            const showActions = canReview(r);

            return (
              <div key={id} className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="font-black text-gray-900">{r.fullName ?? r.FullName}</p>
                    <p className="text-xs text-gray-400">
                      {String(r.workDate ?? r.WorkDate).slice(0, 10)} · {r.totalHours ?? r.TotalHours}h ·{' '}
                      <span className="uppercase font-bold">{st}</span>
                      {submitterRole && (
                        <span className="ml-2 text-indigo-600">· {submitterRole}</span>
                      )}
                    </p>
                    {needsAdmin && st === 'Submitted' && (
                      <p className="text-[10px] font-black uppercase text-amber-700 mt-1">
                        Manager timesheet — admin approval required
                      </p>
                    )}
                    {r.overtimeReason && (
                      <p className="text-sm text-amber-700 mt-2">Overtime: {r.overtimeReason}</p>
                    )}
                    {r.employeeNote && <p className="text-sm text-gray-600 mt-1">{r.employeeNote}</p>}
                  </div>
                  {showActions && (
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
                  {st === 'Submitted' && needsAdmin && isManager && !showActions && (
                    <span className="text-[10px] font-black uppercase text-gray-400 shrink-0">
                      Awaiting admin
                    </span>
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
