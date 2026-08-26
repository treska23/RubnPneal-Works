import Head from 'next/head';
import dynamic from 'next/dynamic';
import SectionLayout from '@components/SectionLayout';

const ComicReader = dynamic(() => import('@components/ui/ComicReader'), {
  ssr: false,
});

export default function ComicPage() {
  return (
    <>
      <Head>
        <title>Cuando los Árboles Dejaron de Hablar — RubnPneal</title>
        <meta
          name="description"
          content="Cómic Cuando los Árboles Dejaron de Hablar, de RubnPneal."
        />
      </Head>
      <div className="bg-[#f5f2e8]">
        <SectionLayout
          eyebrow="Narrativa gráfica"
          title="Cuando los Árboles Dejaron de Hablar"
        >
          <div className="mb-12 grid gap-8 border-t border-black/15 pt-7 lg:grid-cols-[1.2fr_0.8fr] lg:gap-20">
            <p className="max-w-4xl text-3xl font-medium leading-tight tracking-[-0.03em] sm:text-4xl lg:text-5xl">
              Una obra gráfica presentada como pieza central del trabajo de
              ilustración y narrativa visual.
            </p>
            <div className="text-base leading-7 text-black/60">
              <p>
                Lectura directa desde el navegador, sin elementos de juego
                alrededor del cómic.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['Cómic', 'Ilustración', 'Narrativa visual'].map((tag) => (
                  <span
                    key={tag}
                    className="border border-black/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <ComicReader />
          </div>
        </SectionLayout>
      </div>
    </>
  );
}
