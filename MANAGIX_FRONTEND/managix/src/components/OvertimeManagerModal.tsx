import React, { useEffect, useState } from 'react';
import { Select } from './ui';
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
    <div className="fixed inset-0 bg-gray-900/50 z-[200] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl">
        <h2 className="text-lg font-extrabold text-gray-900 mb-2">Overtime — manager action</h2>
        <p className="text-sm text-gray-600 mb-1">
          <strong>{employeeName}</strong> — {detail?.totalHoursThatDay ?? detail?.TotalHoursThatDay}h today
        </p>
        {detail?.taskTitle && (
          <p className="text-xs text-indigo-600 font-bold mb-2">Task: {detail.taskTitle}</p>
        )}
        <p className="text-sm text-gray-500 mb-4 italic">"{reason}"</p>

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
              className="w-full border rounded-xl px-3 py-2 text-sm"
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
            <Select
              value={newAssigneeId}
              onChange={setNewAssigneeId}
              className="w-full"
              placeholder="Select assignee…"
              options={[
                { value: '', label: 'Select assignee…' },
                ...members.map((m: any) => ({
                  value: String(m.employeeId ?? m.EmployeeId ?? m.userId ?? m.UserId),
                  label: m.fullName ?? m.FullName ?? m.email ?? m.Email,
                })),
              ]}
            />
          )}
        </div>

        {error && <p className="text-xs text-red-600 mb-2 font-bold">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={resolve}
            className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-extrabold disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default OvertimeManagerModal;
