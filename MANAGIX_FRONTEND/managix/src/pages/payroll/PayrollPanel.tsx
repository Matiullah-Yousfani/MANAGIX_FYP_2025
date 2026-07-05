import React, { useEffect, useState } from 'react';
import { Select } from '../../components/ui';
import { payrollService } from '../../api/payrollService';
import { projectService } from '../../api/projectService';
import { normalizePayrollSummary } from '../../api/normalize';

const PayrollPanel: React.FC = () => {
  const role = localStorage.getItem('roleName') || localStorage.getItem('userRole');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (role === 'Admin') {
          const org = await payrollService.organization();
          setSummary(normalizePayrollSummary(org));
        } else {
          const uid = localStorage.getItem('userId') || '';
          const list = await projectService.getByManager(uid);
          setProjects(list);
          if (list[0]?.projectId) setSelectedId(list[0].projectId);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [role]);

  useEffect(() => {
    if (!selectedId || role === 'Admin') return;
    payrollService.byProject(selectedId).then((s) => setSummary(s));
  }, [selectedId, role]);

  const selectedProject = projects.find((p) => p.projectId === selectedId);

  if (loading) return <div className="p-12 text-center text-gray-400">Loading payroll…</div>;

  if (role === 'Manager' && projects.length === 0) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center text-gray-500">
        <p className="font-bold">Create a project and assign a team to view payroll estimates.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Payroll & labor cost</h1>
      <p className="text-gray-500 mb-8">Costs use clocked timesheet hours when available; otherwise task estimates.</p>

      {role === 'Manager' && (
        <Select
          value={selectedId}
          onChange={setSelectedId}
          className="mb-6 w-full max-w-md"
          options={projects.map((p) => ({ value: String(p.projectId), label: p.title }))}
        />
      )}

      {selectedProject && role === 'Manager' && (
        <p className="text-sm text-indigo-700 font-bold mb-4">Project: {selectedProject.title}</p>
      )}

      {summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-5">
              <p className="text-xs font-extrabold text-gray-400 uppercase">Budget</p>
              <p className="text-2xl font-extrabold nums">${summary.totalBudget ?? '—'}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-extrabold text-gray-400 uppercase">Labor cost</p>
              <p className="text-2xl font-extrabold text-indigo-600 nums">
                ${typeof summary.totalEstimatedLaborCost === 'number'
                  ? summary.totalEstimatedLaborCost.toFixed(0)
                  : summary.totalEstimatedLaborCost ?? '0'}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-extrabold text-gray-400 uppercase">Remaining</p>
              <p className="text-2xl font-extrabold nums">
                ${typeof summary.budgetRemaining === 'number'
                  ? summary.budgetRemaining.toFixed(0)
                  : summary.budgetRemaining ?? '—'}
              </p>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-4 font-extrabold">Employee</th>
                  <th className="p-4 font-extrabold">Level</th>
                  <th className="p-4 font-extrabold text-right">Hours</th>
                  <th className="p-4 font-extrabold text-right">Rate</th>
                  <th className="p-4 font-extrabold text-right">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {(summary.employees || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500 font-medium">
                      No team members on this project yet. Assign a team in Team Setup, then return here.
                    </td>
                  </tr>
                ) : (
                  (summary.employees || []).map((e: any) => (
                    <tr key={e.userId} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-bold">{e.fullName}</td>
                      <td className="p-4">{e.employeeLevel}</td>
                      <td className="p-4 text-right nums">
                        {e.loggedHours}h
                        <span className="text-[10px] text-gray-400 block uppercase">
                          {e.hoursSource === 'Clocked' ? 'clocked' : 'estimated'}
                        </span>
                      </td>
                      <td className="p-4 text-right nums">${e.hourlyRate}/h</td>
                      <td className="p-4 font-extrabold text-right nums">
                        ${typeof e.estimatedCost === 'number' ? e.estimatedCost.toFixed(0) : e.estimatedCost}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollPanel;
