import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  showValue?: boolean;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  showValue = false,
  color = 'indigo',
  size = 'md',
  className = '',
}) => {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const colorClasses = {
    indigo: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
    emerald: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
    amber: 'bg-gradient-to-r from-amber-500 to-amber-600',
    rose: 'bg-gradient-to-r from-rose-500 to-rose-600',
  }[color];

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  }[size];

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-1">
        {showValue && (
          <span className="text-xs font-semibold text-slate-700">{percentage}%</span>
        )}
      </div>
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${heightClasses}`}>
        <div
          className={`${heightClasses} ${colorClasses} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
