import { cn } from '@/lib/utils';

export function LineSquiggle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('w-6 h-6', className)}
    >
      <path d="M21 15c-1.333-2-2.833-2-4 0-1.833 3.167-3.667 3.167-5.5 0-1.833-3.167-3.667-3.167-5.5 0C4.167 15.667 3 15 2 13" />
      <path d="M22 9c-1.333-2-2.833-2-4 0-1.833 3.167-3.667 3.167-5.5 0-1.833-3.167-3.667-3.167-5.5 0C5.167 9.667 4 9 3 7" />
    </svg>
  );
}
