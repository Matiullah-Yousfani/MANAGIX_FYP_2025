import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiChevronDown, FiCheck } from 'react-icons/fi';

export type SelectOption = { value: string; label: string; disabled?: boolean };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** 'default' = bordered field; 'plain' = borderless inline (e.g. inside a card). */
  variant?: 'default' | 'plain';
};

/**
 * Custom, design-system-styled select. Drop-in for a native <select>:
 * pass `value`, `onChange(value)`, and `options`. The dropdown is rendered
 * in a PORTAL with fixed positioning, so it's never clipped and never shows
 * the ugly OS-default option list.
 */
const Select: React.FC<Props> = ({
  value,
  onChange,
  options,
  placeholder = 'Select',
  disabled = false,
  className = '',
  variant = 'default',
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number }>({ left: 0, width: 0 });

  const selected = options.find((o) => o.value === value);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const maxH = 288;
    const spaceBelow = window.innerHeight - r.bottom;
    if (spaceBelow < maxH && r.top > spaceBelow) {
      setPos({ bottom: window.innerHeight - r.top + 6, left: r.left, width: r.width });
    } else {
      setPos({ top: r.bottom + 6, left: r.left, width: r.width });
    }
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const on = () => updatePosition();
    window.addEventListener('scroll', on, true);
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on, true);
      window.removeEventListener('resize', on);
    };
  }, [open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popupRef.current?.contains(t)) return;
      setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const triggerCls =
    variant === 'plain'
      ? 'w-full flex items-center justify-between gap-2 bg-transparent text-left outline-none disabled:opacity-40 cursor-pointer'
      : 'w-full flex items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left outline-none focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={triggerCls}
      >
        <span className={`truncate ${selected ? '' : 'text-slate-400'}`}>
          {selected?.label ?? placeholder}
        </span>
        <FiChevronDown className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} size={16} />
      </button>

      {open &&
        createPortal(
          <div
            ref={popupRef}
            style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, zIndex: 9999, maxHeight: 288 }}
            className="overflow-auto p-1.5 rounded-xl glass animate-in fade-in zoom-in-95 duration-150"
          >
            {options.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-400">No options</div>
            )}
            {options.map((o) => {
              const active = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  disabled={o.disabled}
                  onClick={() => {
                    if (o.disabled) return;
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors
                    ${active ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-700 hover:bg-slate-100'}
                    ${o.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <span className="truncate">{o.label}</span>
                  {active && <FiCheck size={15} className="shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};

export default Select;
