import React, { useEffect, useState } from 'react';
import { payrollService } from '../../api/payrollService';
import { projectService } from '../../api/projectService';
import { normalizePayrollSummary } from '../../api/normalize';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui';

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

  if (loading) return <div className="p-12 text-center text-fg-subtle">Loading payroll…</div>;

  if (role === 'Manager' && projects.length === 0) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center text-fg-muted">
        <p className="font-bold">Create a project and assign a team to view payroll estimates.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-fg mb-2">Payroll & labor cost</h1>
      <p className="text-fg-muted mb-8">Costs use clocked timesheet hours when available; otherwise task estimates.</p>

      {role === 'Manager' && (
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="mb-6 border border-line rounded-lg px-4 py-3 font-bold w-full max-w-md bg-surface-2 text-fg focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
        >
          {projects.map((p) => (
            <option key={p.projectId} value={p.projectId}>
              {p.title}
            </option>
          ))}
        </select>
      )}

      {selectedProject && role === 'Manager' && (
        <p className="text-sm text-primary font-bold mb-4">Project: {selectedProject.title}</p>
      )}

      {summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface rounded-xl p-5 border border-line">
              <p className="text-xs font-bold text-fg-subtle uppercase">Budget</p>
              <p className="text-2xl font-bold text-fg">${summary.totalBudget ?? '—'}</p>
            </div>
            <div className="bg-surface rounded-xl p-5 border border-line">
              <p className="text-xs font-bold text-fg-subtle uppercase">Labor cost</p>
              <p className="text-2xl font-bold text-primary">
                ${typeof summary.totalEstimatedLaborCost === 'number'
                  ? summary.totalEstimatedLaborCost.toFixed(0)
                  : summary.totalEstimatedLaborCost ?? '0'}
              </p>
            </div>
            <div className="bg-surface rounded-xl p-5 border border-line">
              <p className="text-xs font-bold text-fg-subtle uppercase">Remaining</p>
              <p className="text-2xl font-bold text-fg">
                ${typeof summary.budgetRemaining === 'number'
                  ? summary.budgetRemaining.toFixed(0)
                  : summary.budgetRemaining ?? '—'}
              </p>
            </div>
          </div>

          <Table>
            <THead>
              <TR>
                <TH>Employee</TH>
                <TH>Level</TH>
                <TH>Hours</TH>
                <TH>Rate</TH>
                <TH>Est. cost</TH>
              </TR>
            </THead>
            <TBody>
              {(summary.employees || []).length === 0 ? (
                <TR>
                  <TD colSpan={5} className="p-8 text-center text-fg-muted font-medium">
                    No team members on this project yet. Assign a team in Team Setup, then return here.
                  </TD>
                </TR>
              ) : (
                (summary.employees || []).map((e: any) => (
                  <TR key={e.userId}>
                    <TD className="font-bold">{e.fullName}</TD>
                    <TD className="text-fg-muted">{e.employeeLevel}</TD>
                    <TD>
                      {e.loggedHours}h
                      <span className="text-[10px] text-fg-subtle block uppercase">
                        {e.hoursSource === 'Clocked' ? 'clocked' : 'estimated'}
                      </span>
                    </TD>
                    <TD className="text-fg-muted">${e.hourlyRate}/h</TD>
                    <TD className="font-bold">
                      ${typeof e.estimatedCost === 'number' ? e.estimatedCost.toFixed(0) : e.estimatedCost}
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default PayrollPanel;
