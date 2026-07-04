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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
      <div className="bg-surface rounded-xl max-w-md w-full p-8 shadow-e3">
        <h2 className="text-lg font-bold text-fg mb-2">Daily hours exceeded</h2>
        <p className="text-sm text-fg-muted mb-4">
          You logged {detail?.totalHoursThatDay ?? detail?.TotalHoursThatDay ?? '—'}h today.
          Please briefly explain why you worked past your daily limit.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="w-full border border-line rounded-lg p-3 text-sm mb-3 bg-surface-2 text-fg"
          placeholder="Reason for overtime…"
        />
        {error && <p className="text-xs text-danger mb-2 font-bold">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-fg-muted">
            Later
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="px-5 py-2 bg-primary text-primary-fg rounded-lg text-sm font-bold disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default OvertimeReasonModal;
