import React, { useEffect, useState } from 'react';
import { adminPayrollService } from '../../api/adminPayrollService';

/** Admin Payroll tab — all users, directory-style list with hourly rate. */
const AdminHourlyRatesTab: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const users = await adminPayrollService.listUsers();
      setRows(Array.isArray(users) ? users : []);
    } catch (e: any) {
      setRows([]);
      const status = e?.response?.status;
      if (status === 404) {
        setLoadError('Payroll API not found — restart backend (func start after dotnet build).');
      } else if (status === 403) {
        setLoadError('Admin role required.');
      } else {
        setLoadError(e?.response?.data?.message || 'Could not load payroll settings.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateRate = (userId: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (String(r.userId ?? r.UserId) === userId ? { ...r, hourlyRate: value } : r))
    );
  };

  const saveRate = async (row: any) => {
    const userId = String(row.userId ?? row.UserId);
    const rate = Number(row.hourlyRate ?? row.HourlyRate);
    if (Number.isNaN(rate) || rate < 0) {
      alert('Enter a valid hourly rate (0 or greater).');
      return;
    }
    setSavingId(userId);
    try {
      await adminPayrollService.updateUser(userId, { hourlyRate: rate });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Save failed');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-line shadow-e2 p-32 text-center">
        <div className="inline-block w-8 h-8 border-4 border-line border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-fg-subtle font-bold uppercase tracking-[0.4em] text-[10px]">Loading payroll</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-surface rounded-xl border border-danger/25 p-10">
        <h2 className="text-lg font-bold text-danger mb-2">Could not load</h2>
        <p className="text-sm mb-4 text-fg-muted">{loadError}</p>
        <button
          type="button"
          onClick={load}
          className="px-6 py-3 bg-primary text-primary-fg rounded-lg text-[10px] font-bold uppercase"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-line shadow-e2 overflow-hidden">
      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-xl font-bold uppercase tracking-tight text-fg">Compensation — hourly rates</h2>
        <p className="text-sm text-fg-subtle mt-1 font-medium">
          Set $/hr for every user. Used when calculating payroll from approved timesheets.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line bg-surface-2">
              <th className="px-10 py-8 text-[10px] font-bold text-fg-subtle uppercase tracking-[0.2em]">
                Personnel
              </th>
              <th className="px-10 py-8 text-[10px] font-bold text-fg-subtle uppercase tracking-[0.2em]">
                Status
              </th>
              <th className="px-10 py-8 text-[10px] font-bold text-fg-subtle uppercase tracking-[0.2em]">
                Role
              </th>
              <th className="px-10 py-8 text-[10px] font-bold text-fg-subtle uppercase tracking-[0.2em]">
                Hourly rate ($/hr)
              </th>
              <th className="px-10 py-8 text-[10px] font-bold text-fg-subtle uppercase tracking-[0.2em] text-right">
                Execution
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const uid = String(r.userId ?? r.UserId);
              const displayName = r.fullName ?? r.FullName ?? '?';
              const displayEmail = r.email ?? r.Email ?? '';
              const roleLabel = (r.roleName ?? r.RoleName ?? '—').replace(/_/g, ' ');
              const rateVal = r.hourlyRate ?? r.HourlyRate ?? '';
              return (
                <tr key={uid} className="hover:bg-surface-2 transition-all group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-primary text-primary-fg flex items-center justify-center rounded-xl font-bold text-sm shadow-e1 group-hover:scale-110 transition-transform">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-sm uppercase tracking-tight text-fg">{displayName}</div>
                        <div className="text-[10px] text-fg-subtle font-bold mt-0.5 tracking-wide">
                          {displayEmail}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-success" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-fg-muted">
                        Verified access
                      </span>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className="inline-block bg-surface-2 px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase text-fg">
                      {roleLabel}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-fg-subtle">$</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="w-28 bg-surface-2 text-fg border border-line hover:border-line-strong focus:border-primary focus:ring-2 focus:ring-primary/25 px-4 py-2.5 rounded-lg text-sm font-bold outline-none transition-all"
                        value={rateVal}
                        placeholder="0.00"
                        onChange={(e) => updateRate(uid, e.target.value)}
                      />
                      <span className="text-[9px] font-bold text-fg-subtle uppercase">/ hr</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button
                      type="button"
                      disabled={savingId === uid}
                      onClick={() => saveRate(r)}
                      className="bg-primary text-primary-fg px-6 py-2.5 rounded-lg text-[9px] font-bold uppercase tracking-[0.2em] hover:bg-primary-hover transition-all active:scale-90 shadow-e1 disabled:opacity-50"
                    >
                      {savingId === uid ? 'Saving…' : 'Save rate'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="p-32 text-center">
            <p className="text-fg-subtle font-bold uppercase tracking-[0.5em] text-[10px]">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHourlyRatesTab;
