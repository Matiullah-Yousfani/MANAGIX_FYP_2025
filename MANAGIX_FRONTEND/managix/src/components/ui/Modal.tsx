import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, subtitle, footer, size = 'md', children }) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 8 }}
          transition={{ duration: 0.18 }}
          className={`relative w-full ${sizes[size]} bg-surface border border-line rounded-xl shadow-e3 max-h-[90vh] flex flex-col`}
        >
          {(title || subtitle) && (
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-line">
              <div>
                {title && <h2 className="text-lg font-semibold text-fg">{title}</h2>}
                {subtitle && <p className="text-sm text-fg-muted mt-0.5">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="shrink-0 size-8 grid place-items-center rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors"
                aria-label="Close"
              >
                <FiX className="size-5" />
              </button>
            </div>
          )}
          <div className="px-6 py-5 overflow-y-auto">{children}</div>
          {footer && <div className="px-6 py-4 border-t border-line flex justify-end gap-3">{footer}</div>}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default Modal;
