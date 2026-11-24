import { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface BookCoverProps {
  title: string;
  author: string;
  coverImage?: string;
  coverColor: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BookCover({
  title,
  author,
  coverImage,
  coverColor,
  size = 'md',
  className = '',
}: BookCoverProps) {
  const [failed, setFailed] = useState(false);

  const sizeClasses = {
    sm: 'w-12 h-16 rounded-md',
    md: 'w-24 h-32 rounded-lg',
    lg: 'w-32 h-44 sm:w-36 sm:h-48 rounded-xl',
  }[size];

  const showImage = Boolean(coverImage) && !failed;

  return (
    <div
      className={`relative shrink-0 overflow-hidden border border-black/10 dark:border-white/10 shadow-sm ${sizeClasses} ${className}`}
      style={{ backgroundColor: coverColor }}
    >
      {showImage ? (
        <>
          <img
            src={coverImage}
            alt={`Cover art for ${title} by ${author}`}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
          {/* Subtle spine crease */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/25 to-transparent"
          />
        </>
      ) : (
        <div className="flex h-full w-full flex-col justify-between p-2.5 text-white">
          <div className="flex items-center justify-between opacity-75">
            <BookOpen className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} aria-hidden="true" />
          </div>
          {size !== 'sm' && (
            <div className="min-w-0">
              <p className="font-editorial line-clamp-3 text-xs font-semibold leading-tight text-white">
                {title}
              </p>
              <p className="mt-1 truncate text-[10px] text-white/75">{author}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
