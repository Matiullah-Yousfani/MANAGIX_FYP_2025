import React, { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import { projectService } from '../../api/projectService';
import { adminService } from '../../api/adminService';
import ClosureReportModal from '../ClosureReportModal';
import ProjectGantt from '../ProjectGantt';
import { pick } from '../../api/normalize';

const AdminProjectsTab: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [ganttKey, setGanttKey] = useState(0);

  useEffect(() => {
    api.get('/projects').then((r) => setProjects(Array.isArray(r.data) ? r.data : [])).catch(() => setProjects([]));
  }, []);

  const openProject = async (id: string) => {
    setSelectedId(id);
    setGanttKey((k) => k + 1);
    const d = await adminService.getAdminProjectDetailPage(id).catch(() => projectService.getAdminDetail(id));
    setDetail(d);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-2 max-h-[70vh] overflow-y-auto">
        {projects.map((p) => {
          const id = String(pick(p, 'projectId', 'ProjectId') ?? '');
          const title = pick(p, 'title', 'Title') ?? 'Untitled';
          const status = pick(p, 'status', 'Status');
          const closed = Boolean(pick(p, 'isClosed', 'IsClosed'));
          return (
          <button
            key={id}
            type="button"
            onClick={() => openProject(id)}
            className={`w-full text-left p-4 rounded-xl border transition-all ${selectedId === id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
          >
            <p className="font-bold text-gray-900">{title}</p>
            <p className="text-xs text-gray-500">{status} · {closed ? 'Closed' : 'Active'}</p>
          </button>
        );})}
      </div>

      <div className="lg:col-span-2 space-y-6">
        {!detail ? (
          <p className="text-gray-400 italic">Select a project to view full details.</p>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black">{detail.title}</h2>
                  <p className="text-gray-500 text-sm mt-1">{detail.description}</p>
                </div>
                {detail.status === 'Completed' || detail.isClosed ? (
                  <button type="button" onClick={() => setReportOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black">
                    Closure report
                  </button>
                ) : null}
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Milestones: {detail.milestones?.length ?? 0} · Tasks: {detail.tasks?.length ?? 0} · Members: {detail.members?.length ?? 0}
              </p>
            </div>
            {selectedId && <ProjectGantt projectId={selectedId} refreshKey={ganttKey} />}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 max-h-64 overflow-y-auto">
              <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-3">Tasks</h3>
              <ul className="text-sm space-y-1">
                {(detail.tasks || []).map((t: any) => (
                  <li key={t.taskId} className="flex justify-between border-b border-gray-50 py-1">
                    <span>{t.title}</span>
                    <span className="text-gray-400">{t.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      {selectedId && <ClosureReportModal projectId={selectedId} open={reportOpen} onClose={() => setReportOpen(false)} />}
    </div>
  );
};

export default AdminProjectsTab;
