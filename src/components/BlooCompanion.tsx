import { ArrowRight } from 'lucide-react';

interface BlooCompanionProps {
  headline: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function BlooCompanion({
  headline,
  detail,
  actionLabel,
  onAction,
}: BlooCompanionProps) {
  return (
    <section
      aria-label="Reading companion Bloo"
      className="flex flex-col gap-4 rounded-2xl border border-[#E4E7EC] bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-[#131B2E]"
    >
      <div className="flex items-start gap-4">
        {/* Bloo minimal editorial companion owl/book mark */}
        <div
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D63ED] dark:bg-[#1D63ED]/20 dark:text-[#60A5FA]"
        >
          <svg
            viewBox="0 0 36 36"
            className="h-7 w-7"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="5"
              y="7"
              width="26"
              height="22"
              rx="6"
              stroke="currentColor"
              strokeWidth="2.2"
            />
            <circle cx="13.5" cy="16.5" r="2.2" fill="currentColor" />
            <circle cx="22.5" cy="16.5" r="2.2" fill="currentColor" />
            <path
              d="M15 22.5C16.2 23.8 19.8 23.8 21 22.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M18 7V4.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#5A6577] dark:text-slate-400">
            Bloo · Reading Companion
          </p>
          <h2 className="mt-0.5 text-base font-semibold text-[#121826] dark:text-slate-100">
            {headline}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[#5A6577] dark:text-slate-400">
            {detail}
          </p>
        </div>
      </div>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#1D63ED] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1550C8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D63ED]"
        >
          <span>{actionLabel}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
