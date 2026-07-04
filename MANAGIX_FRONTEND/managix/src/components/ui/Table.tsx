import React from 'react';

/** Dense, dark-themed table set. Wrap rows/cells with these for a consistent data grid.
 *  <Table><THead>…</THead><TBody>…</TBody></Table> */
export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({ className = '', children, ...rest }) => (
  <div className="w-full overflow-x-auto rounded-xl border border-line bg-surface">
    <table className={`w-full text-sm border-collapse ${className}`} {...rest}>
      {children}
    </table>
  </div>
);

export const THead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className = '', children, ...rest }) => (
  <thead className={`bg-surface-2 ${className}`} {...rest}>
    {children}
  </thead>
);

export const TBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className = '', children, ...rest }) => (
  <tbody className={`divide-y divide-line ${className}`} {...rest}>
    {children}
  </tbody>
);

export const TR: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className = '', children, ...rest }) => (
  <tr className={`hover:bg-surface-2/60 transition-colors ${className}`} {...rest}>
    {children}
  </tr>
);

export const TH: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...rest }) => (
  <th
    className={`text-left font-semibold text-fg-subtle uppercase tracking-wide text-[11px] px-4 py-3 whitespace-nowrap ${className}`}
    {...rest}
  >
    {children}
  </th>
);

export const TD: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...rest }) => (
  <td className={`px-4 py-3 text-fg align-middle ${className}`} {...rest}>
    {children}
  </td>
);

export default Table;
