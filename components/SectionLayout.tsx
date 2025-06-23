import React from 'react';
import { cn } from '@/lib/utils';

// 1. Extiende de React.HTMLAttributes<HTMLElement> para heredar:
//    - className?: string
//    - id?: string
//    - style, data-*, etc.
//    - children ya viene incluido en HTMLAttributes
export interface SectionLayoutProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
}

export default function SectionLayout({
  title,
  children,
  className = '',
  ...rest
}: SectionLayoutProps) {
  return (
    <section
      className={cn(
        'w-full max-w-none',
        'mx-auto',
        'px-4 sm:px-8 xl:px-12',
        'py-8 sm:py-12',
        className,
      )}
      {...rest}
    >
      {title && (
        <h1 className="text-3xl font-bold mb-8 text-center">{title}</h1>
      )}
      {children}
    </section>
  );
}
