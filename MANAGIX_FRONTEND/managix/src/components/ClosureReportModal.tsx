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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Project closure report</h2>
            <p className="text-gray-500 text-sm">{report?.title}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><FiX /></button>
        </div>

        {loading ? (
          <p className="text-gray-400 italic">Generating report…</p>
        ) : report ? (
          <div className="space-y-6 text-sm">
            <section className="grid grid-cols-2 gap-4">
              <div><span className="text-gray-400 font-bold">Duration</span><p>{report.durationDays} days</p></div>
              <div><span className="text-gray-400 font-bold">Budget</span><p>${report.budget}</p></div>
              <div><span className="text-gray-400 font-bold">Tasks</span><p>{report.approvedTasks}/{report.totalTasks} approved</p></div>
              <div><span className="text-gray-400 font-bold">Milestones</span><p>{report.completedMilestones}/{report.totalMilestones}</p></div>
              <div><span className="text-gray-400 font-bold">Logged hours</span><p>{report.totalLoggedHours}h</p></div>
              <div><span className="text-gray-400 font-bold">Est. labor cost</span><p>${report.estimatedPayrollCost}</p></div>
            </section>
            <section>
              <h3 className="font-black text-gray-800 mb-2">Team</h3>
              <ul className="space-y-1">
                {(report.members || []).map((m: any) => (
                  <li key={m.userId}>{m.fullName} — {m.employeeLevel}, {m.tasksCompleted} tasks, {m.loggedHours}h</li>
                ))}
              </ul>
            </section>
            <section className="bg-indigo-50 p-4 rounded-xl">
              <h3 className="font-black text-indigo-900 mb-1">AI insights</h3>
              <p className="text-indigo-800">{report.aiInsightsSummary}</p>
            </section>
            <button type="button" onClick={downloadTxt} className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold">
              <FiDownload /> Download report (JSON)
            </button>
          </div>
        ) : (
          <p className="text-red-600">Could not load report.</p>
        )}
      </div>
    </div>
  );
};

export default ClosureReportModal;
