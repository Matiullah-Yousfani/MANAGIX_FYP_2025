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
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onCancel}
        aria-hidden
      />
      <div
        className="relative w-full max-w-[420px] bg-white rounded-2xl shadow-2xl px-8 py-10 text-center animate-in zoom-in-95 duration-200"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
      >
        <div className="mx-auto mb-5 w-[88px] h-[88px] rounded-full border-4 border-amber-200 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
            <FiAlertCircle className="text-amber-500" size={36} strokeWidth={2.5} />
          </div>
        </div>

        <h2
          id="confirm-delete-title"
          className="text-2xl font-semibold text-gray-700 mb-2 tracking-tight"
        >
          {title}
        </h2>
        <p className="text-gray-500 text-[15px] leading-relaxed mb-4">{message}</p>

        {details.length > 0 && (
          <ul className="mb-4 text-left space-y-2 bg-gray-50 rounded-xl p-4 text-sm border border-gray-100">
            {details.map((d) => (
              <li key={d.label} className="flex justify-between gap-3">
                <span className="text-gray-400 font-semibold text-xs uppercase tracking-wide shrink-0">
                  {d.label}
                </span>
                <span className="text-gray-800 font-medium text-right">{d.value}</span>
              </li>
            ))}
          </ul>
        )}

        {warning && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3 mb-4 text-left font-medium">
            {warning}
          </p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 bg-[#3085d6] hover:bg-[#2779c4] text-white py-2.5 px-4 rounded-md font-semibold text-[15px] shadow-sm disabled:opacity-60 transition-colors"
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 bg-[#dd3333] hover:bg-[#c62828] text-white py-2.5 px-4 rounded-md font-semibold text-[15px] shadow-sm disabled:opacity-60 transition-colors"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
