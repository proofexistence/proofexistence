import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

export function AnimatedGradientText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-size animate-bg-position bg-gradient-to-r from-yellow-500 via-red-500 to-yellow-500 bg-[length:300%_100%] bg-clip-text text-transparent',
        className
      )}
    >
      {children}
    </div>
  );
}
