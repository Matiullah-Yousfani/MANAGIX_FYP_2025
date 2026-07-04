import React from 'react';

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

const fieldBase =
  'w-full bg-surface-2 text-fg border border-line rounded-lg px-3.5 py-2.5 text-sm ' +
  'placeholder:text-fg-subtle outline-none transition-colors ' +
  'focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:opacity-50';

/** Wrapper that renders a label / hint / error around any control. */
export const Field: React.FC<FieldProps> = ({ label, hint, error, required, className = '', children }) => (
  <div className={`space-y-1.5 ${className}`}>
    {label && (
      <label className="block text-xs font-semibold text-fg-muted">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
    )}
    {children}
    {error ? (
      <p className="text-xs text-danger">{error}</p>
    ) : hint ? (
      <p className="text-xs text-fg-subtle">{hint}</p>
    ) : null}
  </div>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...rest }, ref) => <input ref={ref} className={`${fieldBase} ${className}`} {...rest} />
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', ...rest }, ref) => (
    <textarea ref={ref} className={`${fieldBase} resize-none ${className}`} {...rest} />
  )
);
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', children, ...rest }, ref) => (
    <select ref={ref} className={`${fieldBase} cursor-pointer ${className}`} {...rest}>
      {children}
    </select>
  )
);
Select.displayName = 'Select';

export default Input;
