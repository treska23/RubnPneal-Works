import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import Seo from '@components/Seo';

export default function NotFoundPage() {
  return (
    <>
      <Seo
        title="Página no encontrada | RubnPneal Works"
        description="La página solicitada no existe. Vuelve al portfolio de Rubn Pneal para explorar software, música, ilustración y cómic."
        path="/404"
        noindex
      />
      <section className="flex min-h-[calc(100svh-72px)] items-center bg-[#0b0b0b] px-5 text-[#f5f2e8] sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-[1440px] border-y border-white/15 py-16 sm:py-24">
          <p className="eyebrow text-white/45">Error 404</p>
          <h1 className="mt-5 max-w-5xl text-[clamp(3.5rem,9vw,8rem)] font-semibold leading-[0.88] tracking-[-0.06em]">
            Esta página no existe.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-white/60 sm:text-lg">
            Puedes volver al inicio o seguir explorando los trabajos del
            portfolio.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/" className="button-light">
              <ArrowLeft className="h-4 w-4" /> Volver al inicio
            </Link>
            <Link href="/services" className="button-ghost-light">
              Ver servicios <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
