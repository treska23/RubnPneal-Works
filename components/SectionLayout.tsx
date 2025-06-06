import React from 'react';

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
    <section className={`relative z-10 py-16 px-4 ${className}`} {...rest}>
      {title && <h2 className="text-4xl font-serif font-bold text-center mb-8">{title}</h2>}
      {children}
    </section>
  );
}
