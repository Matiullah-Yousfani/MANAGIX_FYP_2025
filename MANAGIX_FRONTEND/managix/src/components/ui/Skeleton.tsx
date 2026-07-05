import React from 'react';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Tailwind width/height/shape classes, e.g. "h-4 w-32 rounded". */
  className?: string;
};

/**
 * Shimmer placeholder shown while data loads.
 * Example: <Skeleton className="h-4 w-40 rounded-md" />
 */
const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...rest }) => (
  <div
    className={`relative overflow-hidden bg-slate-200/70 ${className}`}
    {...rest}
  >
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    <style>{`
      @keyframes shimmer { 100% { transform: translateX(100%); } }
    `}</style>
  </div>
);

export default Skeleton;
