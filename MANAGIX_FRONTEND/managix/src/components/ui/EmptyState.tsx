import React from 'react';

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
};

/** Friendly placeholder for empty lists/tables instead of a blank area. */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  action,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6">
    {icon && (
      <div className="grid place-items-center size-16 rounded-2xl bg-slate-100 text-slate-400 mb-4">
        {icon}
      </div>
    )}
    <h3 className="text-base font-bold text-slate-800">{title}</h3>
    {message && (
      <p className="mt-1 text-sm text-slate-500 max-w-sm">{message}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default EmptyState;
