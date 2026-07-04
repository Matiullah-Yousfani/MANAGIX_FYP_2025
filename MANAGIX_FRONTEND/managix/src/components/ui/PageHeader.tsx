import React from 'react';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/** Consistent page title block used at the top of every route. */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon, actions, className = '' }) => (
  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 ${className}`}>
    <div className="flex items-center gap-3 min-w-0">
      {icon && (
        <div className="shrink-0 size-10 grid place-items-center rounded-lg bg-primary-soft text-primary border border-primary-border [&>svg]:size-5">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-fg truncate">{title}</h1>
        {subtitle && <p className="text-sm text-fg-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export default PageHeader;
