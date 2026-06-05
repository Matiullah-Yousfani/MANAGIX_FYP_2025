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
      <div className="bg-white rounded-[2.5rem] border border-[#E5E7EB] shadow-2xl p-32 text-center">
        <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#9CA3AF] font-black uppercase tracking-[0.4em] text-[10px]">Loading payroll</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-red-200 p-10">
        <h2 className="text-lg font-black text-red-700 mb-2">Could not load</h2>
        <p className="text-sm mb-4">{loadError}</p>
        <button
          type="button"
          onClick={load}
          className="px-6 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] border border-[#E5E7EB] shadow-2xl overflow-hidden">
      <div className="px-10 py-8 border-b border-[#F3F4F6]">
        <h2 className="text-xl font-black uppercase tracking-tight">Compensation — hourly rates</h2>
        <p className="text-sm text-[#9CA3AF] mt-1 font-medium">
          Set $/hr for every user. Used when calculating payroll from approved timesheets.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#F3F4F6] bg-white">
              <th className="px-10 py-8 text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.2em]">
                Personnel
              </th>
              <th className="px-10 py-8 text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.2em]">
                Status
              </th>
              <th className="px-10 py-8 text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.2em]">
                Role
              </th>
              <th className="px-10 py-8 text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.2em]">
                Hourly rate ($/hr)
              </th>
              <th className="px-10 py-8 text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.2em] text-right">
                Execution
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {rows.map((r) => {
              const uid = String(r.userId ?? r.UserId);
              const displayName = r.fullName ?? r.FullName ?? '?';
              const displayEmail = r.email ?? r.Email ?? '';
              const roleLabel = (r.roleName ?? r.RoleName ?? '—').replace(/_/g, ' ');
              const rateVal = r.hourlyRate ?? r.HourlyRate ?? '';
              return (
                <tr key={uid} className="hover:bg-[#F9FAFB] transition-all group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-2xl font-black text-sm shadow-lg group-hover:scale-110 transition-transform">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-black text-sm uppercase tracking-tight">{displayName}</div>
                        <div className="text-[10px] text-[#9CA3AF] font-bold mt-0.5 tracking-wide">
                          {displayEmail}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                        Verified access
                      </span>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className="inline-block bg-[#F3F4F6] px-5 py-2.5 rounded-xl text-[10px] font-black uppercase">
                      {roleLabel}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-[#9CA3AF]">$</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="w-28 bg-[#F3F4F6] border border-transparent hover:border-black focus:border-black px-4 py-2.5 rounded-xl text-sm font-black outline-none transition-all"
                        value={rateVal}
                        placeholder="0.00"
                        onChange={(e) => updateRate(uid, e.target.value)}
                      />
                      <span className="text-[9px] font-black text-[#9CA3AF] uppercase">/ hr</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button
                      type="button"
                      disabled={savingId === uid}
                      onClick={() => saveRate(r)}
                      className="bg-black text-white px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-[#1A1A1A] transition-all active:scale-90 shadow-lg disabled:opacity-50"
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
            <p className="text-[#9CA3AF] font-black uppercase tracking-[0.5em] text-[10px]">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHourlyRatesTab;
