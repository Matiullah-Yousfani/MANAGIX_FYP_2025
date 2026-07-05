import React, { useEffect, useMemo, useState } from 'react';
import { toast, Select } from '../../components/ui';
import { timesheetService } from '../../api/timesheetService';
import { formatHoursHms } from '../../utils/timeFormat';
import { parseUtcTimestamp } from '../../utils/timeFormat';

const statusBadge = (st: string) => {
  const s = st.toLowerCase();
  if (s === 'approved') return 'bg-emerald-50 text-emerald-700';
  if (s === 'rejected') return 'bg-red-50 text-red-700';
  if (s === 'submitted') return 'bg-amber-50 text-amber-800';
  return 'bg-gray-100 text-gray-600';
};

const formatTime = (iso?: string | null) => {
  if (!iso) return '—';
  const ms = parseUtcTimestamp(iso);
  if (ms == null) return '—';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const TimesheetsPage: React.FC = () => {
  const userId = localStorage.getItem('userId') || '';
  const role = (localStorage.getItem('roleName') || localStorage.getItem('userRole') || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
      await timesheetService.reviewDaily(id, {
        approve,
        managerComment: comments[id]?.trim() || undefined,
      });
      setComments((c) => ({ ...c, [id]: '' }));
      await load();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Review failed');
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
      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Team timesheets</h1>
      <p className="text-gray-500 mb-6">
        {isAdmin
          ? 'Review daily timesheets with clock-in/out sessions, notes, and approval history.'
          : 'Your team’s timesheets — approve or reject with comments. Your own submissions go to admin.'}
      </p>

      <div className="flex flex-wrap gap-3 mb-8">
        <input
          type="search"
          placeholder="Search name, email, or date…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium flex-1 min-w-[200px]"
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          className="w-44"
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'submitted', label: 'Submitted' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'draft', label: 'Draft' },
          ]}
        />
      </div>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 italic">No timesheet submissions match your filters.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => {
            const id = String(r.dailyTimesheetId ?? r.DailyTimesheetId);
            const st = String(r.status ?? r.Status ?? '');
            const submitterRole = r.submitterRole ?? r.SubmitterRole;
            const needsAdmin = String(submitterRole ?? '').toLowerCase() === 'manager';
            const showActions = canReview(r);
            const entries = r.entries ?? r.Entries ?? [];
            const expanded = expandedId === id;

            return (
              <div key={id} className="bg-white rounded-2xl border border-gray-200/70 overflow-hidden">
                <div className="p-6 flex flex-wrap justify-between items-start gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-extrabold text-gray-900 text-lg">{r.fullName ?? r.FullName}</p>
                    <p className="text-xs text-gray-400">{r.email ?? r.Email}</p>
                    <div className="flex flex-wrap gap-2 mt-2 items-center">
                      <span className="text-sm font-bold text-gray-700">
                        {String(r.workDate ?? r.WorkDate).slice(0, 10)}
                      </span>
                      <span className="text-sm font-extrabold text-indigo-600">
                        {formatHoursHms(Number(r.totalHours ?? r.TotalHours ?? 0))}
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded-lg ${statusBadge(st)}`}>
                        {st}
                      </span>
                      {submitterRole && (
                        <span className="text-[10px] font-bold text-indigo-500 uppercase">{submitterRole}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">
                      Submitted:{' '}
                      {r.submittedAt ?? r.SubmittedAt
                        ? new Date(r.submittedAt ?? r.SubmittedAt).toLocaleString()
                        : '—'}
                      {' · '}
                      Reviewed:{' '}
                      {r.reviewedAt ?? r.ReviewedAt
                        ? new Date(r.reviewedAt ?? r.ReviewedAt).toLocaleString()
                        : '—'}
                    </p>
                    {needsAdmin && st === 'Submitted' && (
                      <p className="text-[10px] font-extrabold uppercase text-amber-700 mt-1">
                        Manager timesheet — admin approval required
                      </p>
                    )}
                    {r.overtimeReason && (
                      <p className="text-sm text-amber-700 mt-2">
                        <strong>Overtime:</strong> {r.overtimeReason ?? r.OvertimeReason}
                      </p>
                    )}
                    {r.employeeNote && (
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Employee note:</strong> {r.employeeNote ?? r.EmployeeNote}
                      </p>
                    )}
                    {r.managerComment && (
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Manager comment:</strong> {r.managerComment ?? r.ManagerComment}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : id)}
                      className="text-xs font-extrabold uppercase text-indigo-600 hover:text-indigo-800"
                    >
                      {expanded ? 'Hide sessions' : 'View clock in/out'}
                    </button>
                    {showActions && (
                      <>
                        <input
                          type="text"
                          placeholder="Review comment"
                          value={comments[id] ?? ''}
                          onChange={(e) => setComments((c) => ({ ...c, [id]: e.target.value }))}
                          className="border rounded-lg px-2 py-1 text-xs min-w-[180px]"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => review(id, true)}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-extrabold"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => review(id, false)}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-extrabold"
                          >
                            Reject
                          </button>
                        </div>
                      </>
                    )}
                    {st === 'Submitted' && needsAdmin && isManager && !showActions && (
                      <span className="text-[10px] font-extrabold uppercase text-gray-400">Awaiting admin</span>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-gray-200/70 bg-gray-50 px-6 py-4">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-3">
                      Clock sessions
                    </p>
                    {entries.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No session entries recorded.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-[10px] font-extrabold text-gray-400 uppercase">
                              <th className="pb-2 pr-4">Clock in</th>
                              <th className="pb-2 pr-4">Clock out</th>
                              <th className="pb-2">Worked</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entries.map((e: any, i: number) => (
                              <tr key={e.timeEntryId ?? e.TimeEntryId ?? i} className="border-t border-gray-200">
                                <td className="py-2 pr-4 font-medium">
                                  {formatTime(e.startedAt ?? e.StartedAt)}
                                </td>
                                <td className="py-2 pr-4 font-medium">
                                  {formatTime(e.endedAt ?? e.EndedAt)}
                                </td>
                                <td className="py-2 font-bold text-indigo-700">
                                  {formatHoursHms(Number(e.hours ?? e.Hours ?? 0))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TimesheetsPage;
