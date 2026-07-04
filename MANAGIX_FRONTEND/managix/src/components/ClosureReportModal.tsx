import React, { useEffect, useState } from 'react';
import { FiDownload, FiX } from 'react-icons/fi';
import { projectService } from '../api/projectService';

interface Props {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

const ClosureReportModal: React.FC<Props> = ({ projectId, open, onClose }) => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !projectId) return;
    setLoading(true);
    projectService.getClosureReport(projectId).then(setReport).finally(() => setLoading(false));
  }, [open, projectId]);

  const downloadTxt = () => {
    if (!report) return;
    const text = JSON.stringify(report, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `closure-report-${report.title || projectId}.json`;
    a.click();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-line rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-e3">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-fg">Project closure report</h2>
            <p className="text-fg-muted text-sm">{report?.title}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-surface-2 rounded-lg text-fg-subtle hover:text-fg transition-colors"><FiX /></button>
        </div>

        {loading ? (
          <p className="text-fg-subtle">Generating report…</p>
        ) : report ? (
          <div className="space-y-6 text-sm text-fg">
            <section className="grid grid-cols-2 gap-4">
              <div><span className="text-fg-subtle font-bold">Duration</span><p>{report.durationDays} days</p></div>
              <div><span className="text-fg-subtle font-bold">Budget</span><p>${report.budget}</p></div>
              <div><span className="text-fg-subtle font-bold">Tasks</span><p>{report.approvedTasks}/{report.totalTasks} approved</p></div>
              <div><span className="text-fg-subtle font-bold">Milestones</span><p>{report.completedMilestones}/{report.totalMilestones}</p></div>
              <div><span className="text-fg-subtle font-bold">Logged hours</span><p>{report.totalLoggedHours}h</p></div>
              <div><span className="text-fg-subtle font-bold">Est. labor cost</span><p>${report.estimatedPayrollCost}</p></div>
            </section>
            <section>
              <h3 className="font-bold text-fg mb-2">Team</h3>
              <ul className="space-y-1">
                {(report.members || []).map((m: any) => (
                  <li key={m.userId}>{m.fullName} — {m.employeeLevel}, {m.tasksCompleted} tasks, {m.loggedHours}h</li>
                ))}
              </ul>
            </section>
            <section className="bg-primary-soft border border-primary-border p-4 rounded-xl">
              <h3 className="font-bold text-primary mb-1">AI insights</h3>
              <p className="text-fg-muted">{report.aiInsightsSummary}</p>
            </section>
            <button type="button" onClick={downloadTxt} className="flex items-center gap-2 bg-primary text-primary-fg hover:bg-primary-hover transition-colors px-6 py-3 rounded-lg font-bold">
              <FiDownload /> Download report (JSON)
            </button>
          </div>
        ) : (
          <p className="text-danger">Could not load report.</p>
        )}
      </div>
    </div>
  );
};

export default ClosureReportModal;
