import dynamic from 'next/dynamic';
import SectionLayout from '@components/SectionLayout';
import Seo from '@components/Seo';
import ComicPurchase from '@components/ui/ComicPurchase';
import { absoluteUrl, breadcrumbStructuredData, SITE_ORIGIN } from '@/lib/seo';

const ComicReader = dynamic(() => import('@components/ui/ComicReader'), {
  ssr: false,
});

const structuredData = [
  {
    '@type': 'CreativeWork',
    '@id': `${absoluteUrl('/comic')}#comic`,
    name: 'Cuando los Árboles Dejaron de Hablar',
    description:
      'Cómic online de Rubén Pneal presentado en un lector continuo adaptado a la lectura en pantalla.',
    url: absoluteUrl('/comic'),
    inLanguage: 'es',
    genre: ['Cómic', 'Narrativa gráfica', 'Ilustración'],
    author: { '@id': `${SITE_ORIGIN}/#person` },
    encoding: {
      '@type': 'MediaObject',
      contentUrl: absoluteUrl('/comic-web.pdf'),
      encodingFormat: 'application/pdf',
    },
  },
  breadcrumbStructuredData([
    { name: 'Inicio', path: '/' },
    { name: 'Cómic', path: '/comic' },
  ]),
];

export default function ComicPage() {
  return (
    <>
      <Seo
        title="Cuando los Árboles Dejaron de Hablar | Cómic online"
        description="Lee online Cuando los Árboles Dejaron de Hablar, el cómic de Rubén Pneal: ilustración y narrativa gráfica en un lector continuo para pantalla."
        path="/comic"
        type="article"
        structuredData={structuredData}
      />
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

          <div className="grid items-stretch gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="flex min-w-0 items-center justify-center">
              <ComicReader />
            </div>
            <div className="flex min-w-0 items-center justify-center border-t border-black/15 pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              <ComicPurchase />
            </div>
          </div>
        </SectionLayout>
      </div>
    </>
  );
}
