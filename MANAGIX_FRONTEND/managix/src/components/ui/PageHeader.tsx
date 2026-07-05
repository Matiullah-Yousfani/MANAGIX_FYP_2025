import React from 'react';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Small uppercase label above the title (e.g. section / breadcrumb). */
  eyebrow?: string;
  /** Right-aligned actions (buttons, filters). */
  actions?: React.ReactNode;
  icon?: React.ReactNode;
};

/**
 * Consistent page heading with strong type hierarchy.
 * Drop this at the top of any page to instantly look like a real product.
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  eyebrow,
  actions,
  icon,
}) => (
  <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
    <div className="flex items-center gap-4">
      {icon && (
        <div className="grid place-items-center size-12 rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/20">
          {icon}
        </div>
      )}
      <div>
        {eyebrow && (
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600 mb-1">
            {eyebrow}
          </div>
        )}
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export default PageHeader;
