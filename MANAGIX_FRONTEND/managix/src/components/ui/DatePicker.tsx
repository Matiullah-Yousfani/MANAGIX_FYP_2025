import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

type Props = {
  /** Controlled value in `yyyy-mm-dd` (same format as a native date input). */
  value?: string;
  /** Called with the new `yyyy-mm-dd` string (mirrors native onChange value). */
  onChange: (value: string) => void;
  /** Minimum selectable date, `yyyy-mm-dd`. */
  min?: string;
  placeholder?: string;
  className?: string;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const POPUP_W = 288; // w-72
const POPUP_H = 360; // approx, for flip calculation

const pad = (n: number) => String(n).padStart(2, '0');
const toStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function parse(v?: string): { y: number; m: number; d: number } | null {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { y, m: m - 1, d };
}

function fmtDisplay(v?: string): string {
  const p = parse(v);
  return p ? `${pad(p.d)}/${pad(p.m + 1)}/${p.y}` : '';
}

/**
 * Fully custom, design-system-styled date picker.
 * Drop-in replacement for `<input type="date">` — same value format (`yyyy-mm-dd`),
 * same `min` support. The calendar is rendered in a PORTAL with fixed positioning,
 * so it can never be clipped by a parent's overflow/rounded corners.
 */
const DatePicker: React.FC<Props> = ({ value, onChange, min, placeholder = 'dd/mm/yyyy', className = '' }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const selected = parse(value);
  const today = new Date();
  const [view, setView] = useState(() => {
    const base = selected ?? { y: today.getFullYear(), m: today.getMonth() };
    return { y: base.y, m: base.m };
  });

  useEffect(() => {
    if (selected) setView({ y: selected.y, m: selected.m });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < POPUP_H && r.top > POPUP_H;
    const top = openUp ? r.top - POPUP_H - 8 : r.bottom + 8;
    let left = r.left;
    // keep within viewport horizontally
    if (left + POPUP_W > window.innerWidth - 8) left = window.innerWidth - POPUP_W - 8;
    if (left < 8) left = 8;
    setCoords({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const cells = useMemo(() => {
    const firstDow = new Date(view.y, view.m, 1).getDay();
    const days = new Date(view.y, view.m + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) arr.push(null);
    for (let d = 1; d <= days; d++) arr.push(d);
    return arr;
  }, [view]);

  const isDisabled = (d: number) => (min ? toStr(view.y, view.m, d) < min : false);
  const isSelected = (d: number) =>
    selected && selected.y === view.y && selected.m === view.m && selected.d === d;
  const isToday = (d: number) =>
    view.y === today.getFullYear() && view.m === today.getMonth() && d === today.getDate();

  const move = (delta: number) => {
    const m = view.m + delta;
    setView({ y: view.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  };

  const pick = (d: number) => {
    if (isDisabled(d)) return;
    onChange(toStr(view.y, view.m, d));
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left outline-none focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 transition-all"
      >
        <FiCalendar className="text-slate-400 shrink-0" />
        <span className={value ? 'text-slate-800 font-semibold nums' : 'text-slate-400'}>
          {value ? fmtDisplay(value) : placeholder}
        </span>
      </button>

      {open &&
        createPortal(
          <div
            ref={popupRef}
            style={{ position: 'fixed', top: coords.top, left: coords.left, width: POPUP_W, zIndex: 9999 }}
            className="p-4 rounded-2xl glass animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-slate-900">
                {MONTHS[view.m]} {view.y}
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => move(-1)} className="grid place-items-center size-7 rounded-lg hover:bg-slate-100 text-slate-500">
                  <FiChevronLeft size={16} />
                </button>
                <button type="button" onClick={() => move(1)} className="grid place-items-center size-7 rounded-lg hover:bg-slate-100 text-slate-500">
                  <FiChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {DOW.map((d) => (
                <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) =>
                d === null ? (
                  <div key={i} />
                ) : (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pick(d)}
                    disabled={isDisabled(d)}
                    className={`h-9 rounded-lg text-sm font-semibold nums transition-colors
                      ${isSelected(d)
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : isDisabled(d)
                          ? 'text-slate-300 cursor-not-allowed'
                          : isToday(d)
                            ? 'text-indigo-600 ring-1 ring-indigo-200 hover:bg-indigo-50'
                            : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    {d}
                  </button>
                )
              )}
            </div>

            <div className="flex justify-between mt-3 pt-3 border-t border-slate-200/70">
              <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = toStr(today.getFullYear(), today.getMonth(), today.getDate());
                  if (!min || t >= min) { onChange(t); setOpen(false); }
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Today
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default DatePicker;
