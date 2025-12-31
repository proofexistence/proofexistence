import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  align?: 'left' | 'center';
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  className,
  align = 'left',
  children,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 mb-12',
        align === 'center' ? 'text-center items-center' : 'items-start',
        className
      )}
    >
      <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#0CC9F2] via-[#4877DA] to-[#7E44DB]">
        {title}
      </h1>
      {description && (
        <p className="text-zinc-400 max-w-2xl text-lg leading-relaxed">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
