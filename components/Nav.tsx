import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

const links = [
  { href: '/', label: 'Inicio' },
  { href: '/development', label: 'Programación' },
  { href: '/music', label: 'Música' },
  { href: '/comic', label: 'Cómic' },
  { href: '/services', label: 'Servicios' },
];

export default function Nav() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? router.pathname === '/' : router.pathname.startsWith(href);

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-[72px] border-b border-black/10 bg-[#f5f2e8]/90 backdrop-blur-xl">
      <nav className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="flex items-center gap-3"
          onClick={() => setOpen(false)}
        >
          <Image src="/logo.svg" alt="RubnPneal" width={38} height={38} priority />
          <span className="hidden text-sm font-semibold uppercase tracking-[0.18em] sm:block">
            RubnPneal
          </span>
        </Link>

        <ul className="hidden items-center gap-7 lg:flex">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`text-[12px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                  isActive(href)
                    ? 'text-black'
                    : 'text-black/50 hover:text-black'
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <a
          href="mailto:ruben.pineal.lopez@hotmail.com"
          className="hidden border-b border-black pb-1 text-[12px] font-semibold uppercase tracking-[0.16em] lg:block"
        >
          Contactar
        </a>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center border border-black/15 lg:hidden"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
        >
          {open ? (
            <XMarkIcon className="h-5 w-5" />
          ) : (
            <Bars3Icon className="h-5 w-5" />
          )}
        </button>
      </nav>

      {open && (
        <div className="border-b border-black/10 bg-[#f5f2e8] px-5 py-5 lg:hidden">
          <ul className="mx-auto max-w-[1440px] space-y-1">
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`block border-b border-black/10 py-4 text-xl font-medium ${
                    isActive(href) ? 'text-black' : 'text-black/60'
                  }`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
