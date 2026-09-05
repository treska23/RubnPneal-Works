import dynamic from 'next/dynamic';
import SectionLayout from '@components/SectionLayout';
import Seo from '@components/Seo';
import ComicPurchase from '@components/ui/ComicPurchase';
import ComicShare from '@components/ui/ComicShare';
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
      'En Verlandina, una pequeña nación rodeada de bosque, la promesa de proteger la felicidad individual convive con una justicia brutal contra los llamados vampiros emocionales.',
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
        title="Cuando los Árboles Dejaron de Hablar: cómic gratis online"
        description="Lee completo el cómic de Rubén Pneal, Cuando los Árboles Dejaron de Hablar. Consigue el PDF en HD aportando la cantidad que quieras mediante PayPal."
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
            <div>
              <p className="max-w-4xl text-2xl font-medium leading-snug tracking-[-0.02em] sm:text-3xl">
                En Verlandina, una pequeña nación rodeada de bosque, la promesa
                de proteger la felicidad individual convive con una justicia
                brutal contra los llamados «vampiros emocionales».
              </p>
              <p className="mt-5 text-base leading-7 text-black/60">
                Un cómic de Rubén Pneal. 105 páginas para leer completas en el
                navegador.
              </p>
            </div>
            <div className="text-base leading-7 text-black/60">
              <p>
                Lee el cómic completo gratis. Si quieres conservarlo con mayor
                definición y apoyar mi trabajo, elige tu aportación por PayPal y
                accede al PDF en HD.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['Lectura gratuita', 'PDF en HD', 'Aportación voluntaria'].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="border border-black/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
                    >
                      {tag}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>

          <a href="#comic-reader" className="button-dark mb-6 mr-3">
            Leer gratis
          </a>
          <a
            href="#comic-purchase"
            className="mb-6 inline-flex min-h-12 items-center border border-black/30 px-6 py-3 text-sm font-semibold"
          >
            Conseguir el PDF en HD
          </a>

          <div className="grid items-stretch justify-items-center gap-6 lg:grid-cols-2 lg:justify-items-stretch lg:gap-8">
            <div
              id="comic-reader"
              className="flex w-full min-w-0 scroll-mt-24 items-stretch justify-center"
            >
              <ComicReader />
            </div>
            <div className="flex w-full min-w-0 items-stretch">
              <ComicPurchase />
            </div>
          </div>
          <section className="mt-12 border-t border-black/15 pt-8">
            <h2 className="text-3xl font-semibold">
              Lectura gratuita y edición HD
            </h2>
            <div className="mt-7 grid gap-8 md:grid-cols-3">
              <div>
                <h3 className="text-xl font-semibold">
                  ¿Puedo leerlo entero sin pagar?
                </h3>
                <p className="mt-3 text-base leading-7 text-black/65">
                  Sí. El lector de esta página contiene el cómic completo y no
                  requiere registro ni pago.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold">
                  ¿Cuánto cuesta la edición HD?
                </h3>
                <p className="mt-3 text-base leading-7 text-black/65">
                  Tú eliges la cantidad en euros. Introduce una aportación desde
                  0,01 € y continúa a PayPal para confirmarla.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold">¿Cómo recibo el PDF?</h3>
                <p className="mt-3 text-base leading-7 text-black/65">
                  Tras confirmar el pago, regresa a esta página: aparecerá el
                  enlace al PDF en alta definición. Guarda el archivo: el enlace
                  caduca a las 24 horas y queda recordado en este navegador.
                </p>
              </div>
            </div>
          </section>
          <ComicShare />
        </SectionLayout>
      </div>
    </>
  );
}
