import React, { useEffect, useState } from 'react';
import { overtimeService } from '../api/overtimeService';
import { teamService } from '../api/teamService';
import { projectService } from '../api/projectService';

type Props = {
  requestId: string;
  onClose: () => void;
  onResolved: () => void;
};

const OvertimeManagerModal: React.FC<Props> = ({ requestId, onClose, onResolved }) => {
  const [detail, setDetail] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [action, setAction] = useState<'ExtendDeadline' | 'Reassign'>('ExtendDeadline');
  const [newDeadline, setNewDeadline] = useState('');
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    overtimeService.get(requestId).then(async (d) => {
      setDetail(d);
      const pid = d?.projectId ?? d?.ProjectId;
      if (pid) {
        try {
          const team = await projectService.getTeamByProjectId(String(pid));
          const tid = team?.teamId ?? team?.TeamId;
          if (tid) {
            const m = await teamService.getTeamMembers(String(tid));
            setMembers(Array.isArray(m) ? m : []);
          }
        } catch {
          setMembers([]);
        }
      }
    }).catch(() => setDetail(null));
  }, [requestId]);

  const resolve = async () => {
    setBusy(true);
    setError(null);
    try {
      if (action === 'ExtendDeadline') {
        await overtimeService.resolve(requestId, {
          action: 'ExtendDeadline',
          newDeadline: newDeadline || undefined,
          additionalEstimatedHours: 2,
        });
      } else {
        if (!newAssigneeId) {
          setError('Select a team member to reassign.');
          setBusy(false);
          return;
        }
        await overtimeService.resolve(requestId, {
          action: 'Reassign',
          newAssigneeId,
        });
      }
      onResolved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const employeeName = detail?.employeeName ?? detail?.EmployeeName ?? 'Employee';
  const reason = detail?.employeeReason ?? detail?.EmployeeReason ?? '';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
      <div className="bg-surface rounded-xl max-w-lg w-full p-8 shadow-e3">
        <h2 className="text-lg font-bold text-fg mb-2">Overtime — manager action</h2>
        <p className="text-sm text-fg-muted mb-1">
          <strong>{employeeName}</strong> — {detail?.totalHoursThatDay ?? detail?.TotalHoursThatDay}h today
        </p>
        {detail?.taskTitle && (
          <p className="text-xs text-primary font-bold mb-2">Task: {detail.taskTitle}</p>
        )}
        <p className="text-sm text-fg-muted mb-4">"{reason}"</p>

        <div className="space-y-3 mb-4">
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="radio"
              checked={action === 'ExtendDeadline'}
              onChange={() => setAction('ExtendDeadline')}
            />
            Extend task deadline
          </label>
          {action === 'ExtendDeadline' && (
            <input
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-surface-2 text-fg"
            />
          )}
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="radio"
              checked={action === 'Reassign'}
              onChange={() => setAction('Reassign')}
            />
            Reassign task
          </label>
          {action === 'Reassign' && (
            <select
              value={newAssigneeId}
              onChange={(e) => setNewAssigneeId(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-surface-2 text-fg"
            >
              <option value="">Select assignee…</option>
              {members.map((m: any) => {
                const id = m.employeeId ?? m.EmployeeId ?? m.userId ?? m.UserId;
                const name = m.fullName ?? m.FullName ?? m.email ?? m.Email;
                return (
                  <option key={id} value={id}>
                    {name}
                  </option>
                );
              })}
            </select>
          )}
        </div>

        {error && <p className="text-xs text-danger mb-2 font-bold">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-fg-muted">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={resolve}
            className="px-5 py-2 bg-primary text-primary-fg rounded-lg text-sm font-bold disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default OvertimeManagerModal;
