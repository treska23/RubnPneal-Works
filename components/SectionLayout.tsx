import React from 'react';
import { cn } from '@/lib/utils';

export interface SectionLayoutProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  eyebrow?: string;
}

export default function SectionLayout({
  title,
  eyebrow,
  children,
  className = '',
  ...rest
}: SectionLayoutProps) {
  return (
    <section
      className={cn('mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24', className)}
      {...rest}
    >
      {(title || eyebrow) && (
        <header className="mb-12 max-w-4xl sm:mb-16">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          {title && <h1 className="display-title mt-4 text-5xl sm:text-6xl lg:text-7xl">{title}</h1>}
        </header>
      )}
      {children}
    </section>
  );
}
