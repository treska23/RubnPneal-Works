import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

/**
 * Navbar inspirado en los ejemplos oficiales de Tailwind CSS v4 (UI Blocks → Navigation → Navbars)
 * https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/navbars
 */
export default function Nav() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: "Inicio" },
    { href: "/comic", label: "Cómic" },
    { href: "/music", label: "Música" },
    { href: "/videos", label: "Vídeos" },
    { href: "/services", label: "Servicios" },
  ];

  return (
    <header className="sticky top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md shadow-sm">
      <nav className="relative inset-x-0 top-0 bg-white/75 backdrop-blur-md shadow-sm flex items-center justify-between w-full px-4 sm:px-8 lg:px-16 max-w-4xl mx-auto">
        {/* --- Logo --- */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <Image src="/logo.svg" alt="Logo" width={40} height={40} priority />
          <span className="text-xl font-bold">RubnPneal</span>{" "}
        </div>

        {/* --- Links desktop --- */}
        <ul className="hidden lg:flex flex-1 justify-center space-x-6 font-sans uppercase tracking-wide">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={
                  router.pathname === href
                    ? "text-gray-900 after:block after:h-0.5 after:w-full after:bg-gray-900"
                    : "text-gray-600 hover:text-gray-900 transition-colors"
                }
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* --- Botón móvil --- */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="lg:hidden -m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700 hover:bg-gray-100"
          aria-label="Abrir menú principal"
        >
          {open ? (
            <XMarkIcon className="h-6 w-6" />
          ) : (
            <Bars3Icon className="h-6 w-6" />
          )}
        </button>
      </nav>

      {/* --- Menú móvil --- */}
      {open && (
        <ul className="lg:hidden space-y-1 border-t border-gray-200 bg-white p-4 text-base font-semibold uppercase tracking-wide">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={
                  router.pathname === href
                    ? "block rounded-md px-3 py-2 bg-gray-100 text-gray-900"
                    : "block rounded-md px-3 py-2 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
