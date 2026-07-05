import React, { useEffect, useState } from 'react';
import { overtimeService } from '../api/overtimeService';

type Props = {
  requestId: string;
  onClose: () => void;
  onSubmitted: () => void;
};

const OvertimeReasonModal: React.FC<Props> = ({ requestId, onClose, onSubmitted }) => {
  const [detail, setDetail] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    overtimeService.get(requestId).then(setDetail).catch(() => setDetail(null));
  }, [requestId]);

  const submit = async () => {
    if (!reason.trim()) {
      setError('Please enter a reason.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await overtimeService.submitReason(requestId, reason.trim());
      onSubmitted();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 z-[200] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
        <h2 className="text-lg font-extrabold text-gray-900 mb-2">Daily hours exceeded</h2>
        <p className="text-sm text-gray-500 mb-4">
          You logged {detail?.totalHoursThatDay ?? detail?.TotalHoursThatDay ?? '—'}h today.
          Please briefly explain why you worked past your daily limit.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="w-full border border-gray-200 rounded-xl p-3 text-sm mb-3"
          placeholder="Reason for overtime…"
        />
        {error && <p className="text-xs text-red-600 mb-2 font-bold">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500">
            Later
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-extrabold disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default OvertimeReasonModal;
