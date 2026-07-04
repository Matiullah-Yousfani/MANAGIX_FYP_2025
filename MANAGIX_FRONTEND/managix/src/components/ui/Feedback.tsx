import React from 'react';

/** Full-panel empty state. */
export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon, title, description, action, className = '' }) => (
  <div
    className={`flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl border border-dashed border-line bg-surface/50 ${className}`}
  >
    {icon && <div className="mb-4 text-fg-subtle [&>svg]:size-10 [&>svg]:mx-auto">{icon}</div>}
    <p className="text-fg font-semibold">{title}</p>
    {description && <p className="text-fg-muted text-sm mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/** Skeleton shimmer block — use for loading placeholders instead of a bare spinner. */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-surface-3 ${className}`} />
);

/** Centered spinner for full-page loads. */
export const Spinner: React.FC<{ label?: string; className?: string }> = ({ label, className = '' }) => (
  <div className={`flex flex-col items-center justify-center gap-3 py-20 ${className}`}>
    <div className="size-9 rounded-full border-[3px] border-line border-t-primary animate-spin" />
    {label && <p className="text-fg-muted text-sm">{label}</p>}
  </div>
);

export default EmptyState;
