import React, { useEffect, useMemo, useState } from 'react';
import { FiClock, FiSearch, FiFilter } from 'react-icons/fi';
import { timesheetService } from '../../api/timesheetService';
import { formatHoursHms } from '../../utils/timeFormat';

const EmployeeTimesheetPage: React.FC = () => {
  const userId = localStorage.getItem('userId') || '';
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    timesheetService.myHistory(userId)
      .then((list) => setRows(Array.isArray(list) ? list : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter !== 'all') {
      list = list.filter((r) => String(r.status ?? r.Status ?? '').toLowerCase() === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const date = new Date(r.workDate ?? r.WorkDate).toLocaleDateString().toLowerCase();
        const note = String(r.employeeNote ?? r.EmployeeNote ?? '').toLowerCase();
        const mgr = String(r.managerComment ?? r.ManagerComment ?? '').toLowerCase();
        return date.includes(q) || note.includes(q) || mgr.includes(q);
      });
    }
    return list;
  }, [rows, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const clockInFor = (entries: any[]) => {
    if (!entries?.length) return '—';
    const sorted = [...entries].sort((a, b) =>
      new Date(a.startedAt ?? a.StartedAt).getTime() - new Date(b.startedAt ?? b.StartedAt).getTime());
    const first = sorted[0];
    return new Date(first.startedAt ?? first.StartedAt).toLocaleTimeString();
  };

  const clockOutFor = (entries: any[]) => {
    if (!entries?.length) return '—';
    const withEnd = entries.filter((e) => e.endedAt ?? e.EndedAt);
    if (!withEnd.length) return '—';
    const last = [...withEnd].sort((a, b) =>
      new Date(b.endedAt ?? b.EndedAt).getTime() - new Date(a.endedAt ?? a.EndedAt).getTime())[0];
    return new Date(last.endedAt ?? last.EndedAt).toLocaleTimeString();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <div className="mb-8">
        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Employee Portal</p>
        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
          <FiClock /> My Timesheet
        </h1>
        <p className="text-gray-500 text-sm mt-2">Your submitted daily timesheets and manager review status.</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by date or notes..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm"
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2">
          <FiFilter className="text-gray-400" size={14} />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-sm font-bold text-gray-700 outline-none bg-transparent"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-500">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Clock In</th>
                <th className="text-left px-4 py-3">Clock Out</th>
                <th className="text-left px-4 py-3">Worked Hours</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Manager Review</th>
                <th className="text-left px-4 py-3">Comments</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 italic">Loading…</td></tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="font-bold text-gray-600">No timesheet records yet.</p>
                    <p className="text-sm text-gray-400 mt-1">Clock in from the dashboard and submit your day when done.</p>
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => {
                  const entries = r.entries ?? r.Entries ?? [];
                  const status = String(r.status ?? r.Status ?? 'Draft');
                  return (
                    <tr key={r.dailyTimesheetId ?? r.DailyTimesheetId} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-bold">{new Date(r.workDate ?? r.WorkDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{clockInFor(entries)}</td>
                      <td className="px-4 py-3">{clockOutFor(entries)}</td>
                      <td className="px-4 py-3 font-mono">{formatHoursHms(Number(r.totalHours ?? r.TotalHours ?? 0))}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                          status === 'Approved' ? 'bg-emerald-50 text-emerald-700'
                          : status === 'Rejected' ? 'bg-red-50 text-red-700'
                          : status === 'Submitted' ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {r.reviewedAt ?? r.ReviewedAt
                          ? new Date(r.reviewedAt ?? r.ReviewedAt).toLocaleDateString()
                          : status === 'Submitted' ? 'Pending' : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={r.managerComment ?? r.ManagerComment ?? r.employeeNote ?? r.EmployeeNote}>
                        {r.managerComment ?? r.ManagerComment ?? r.employeeNote ?? r.EmployeeNote ?? '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs font-bold text-gray-500">
            <span>Page {page} of {totalPages} ({filtered.length} records)</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-40">Prev</button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeTimesheetPage;
