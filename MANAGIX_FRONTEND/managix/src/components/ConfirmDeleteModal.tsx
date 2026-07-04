import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';

export type ConfirmDeleteDetail = { label: string; value: string };

type Props = {
  open: boolean;
  /** Main heading — defaults to SweetAlert-style "Are you sure?" */
  title?: string;
  /** Subtitle — defaults to "You won't be able to revert this!" */
  message?: string;
  details?: ConfirmDeleteDetail[];
  warning?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmDeleteModal: React.FC<Props> = ({
  open,
  title = 'Are you sure?',
  message = "You won't be able to revert this!",
  details = [],
  warning,
  confirmLabel = 'Yes, delete it!',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden
      />
      <div
        className="relative w-full max-w-[420px] bg-surface border border-line rounded-xl shadow-e3 px-8 py-10 text-center animate-in zoom-in-95 duration-200"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
      >
        <div className="mx-auto mb-5 w-[88px] h-[88px] rounded-full border-4 border-warning/25 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-warning-soft flex items-center justify-center">
            <FiAlertCircle className="text-warning" size={36} strokeWidth={2.5} />
          </div>
        </div>

        <h2
          id="confirm-delete-title"
          className="text-xl font-semibold text-fg mb-2 tracking-tight"
        >
          {title}
        </h2>
        <p className="text-fg-muted text-[15px] leading-relaxed mb-4">{message}</p>

        {details.length > 0 && (
          <ul className="mb-4 text-left space-y-2 bg-surface-2 rounded-lg p-4 text-sm border border-line">
            {details.map((d) => (
              <li key={d.label} className="flex justify-between gap-3">
                <span className="text-fg-subtle font-semibold text-xs uppercase tracking-wide shrink-0">
                  {d.label}
                </span>
                <span className="text-fg font-medium text-right">{d.value}</span>
              </li>
            ))}
          </ul>
        )}

        {warning && (
          <p className="text-xs text-warning bg-warning-soft border border-warning/25 rounded-lg p-3 mb-4 text-left font-medium">
            {warning}
          </p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 bg-danger text-white hover:bg-danger/90 py-2.5 px-4 rounded-lg font-semibold text-[15px] shadow-e1 disabled:opacity-60 transition-colors"
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 bg-surface-2 text-fg border border-line hover:bg-surface-3 hover:border-line-strong py-2.5 px-4 rounded-lg font-semibold text-[15px] disabled:opacity-60 transition-colors"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
