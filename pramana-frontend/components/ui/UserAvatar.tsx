'use client';

import React from 'react';

interface UserAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ name, size = 'md', className = '' }) => {
  const initials = (name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('') || 'U';

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  }[size];

  // Deterministic clean background color based on name string
  const colorBgs = [
    'bg-indigo-600 text-white ring-indigo-300/40',
    'bg-purple-600 text-white ring-purple-300/40',
    'bg-blue-600 text-white ring-blue-300/40',
    'bg-teal-600 text-white ring-teal-300/40',
    'bg-emerald-600 text-white ring-emerald-300/40',
    'bg-slate-700 text-white ring-slate-400/40',
  ];
  const charCodeSum = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const selectedBg = colorBgs[charCodeSum % colorBgs.length];

  return (
    <div
      className={`rounded-xl font-extrabold flex items-center justify-center shrink-0 select-none shadow-2xs ring-1 ${selectedBg} ${sizeClasses} ${className}`}
      title={name}
    >
      {initials}
    </div>
  );
};
