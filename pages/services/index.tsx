import {
  ArrowUpRight,
  Clapperboard,
  Code2,
  Mail,
  Mic2,
  Music2,
  PenTool,
  SlidersHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import SectionLayout from '@components/SectionLayout';
import Seo from '@components/Seo';
import { absoluteUrl, breadcrumbStructuredData, SITE_ORIGIN } from '@/lib/seo';

const EMAIL = 'ruben.pineal.lopez@hotmail.com';

const services: {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  muted: string;
}[] = [
  {
    title: 'Desarrollo de software',
    description:
      'Aplicaciones .NET, herramientas de escritorio, automatización, integraciones y soluciones con IA local cuando tiene sentido usarla.',
    icon: Code2,
    tone: 'bg-[#111111] text-white',
    muted: 'text-white/60',
  },
  {
    title: 'Composición y producción',
    description:
      'Música original, arreglos, producción y desarrollo de una pieza desde la idea hasta una versión lista para publicar.',
    icon: Music2,
    tone: 'bg-[#ff4d00] text-black',
    muted: 'text-black/65',
  },
  {
    title: 'Mezcla',
    description:
      'Edición y mezcla musical con atención al equilibrio, la dinámica y el carácter de la producción.',
    icon: SlidersHorizontal,
    tone: 'bg-[#e7dfcf] text-black',
    muted: 'text-black/60',
  },
  {
    title: 'Diseño e ilustración',
    description:
      'Ilustración, dibujo y piezas gráficas para proyectos editoriales, musicales, digitales o de comunicación.',
    icon: PenTool,
    tone: 'bg-[#d7dfca] text-black',
    muted: 'text-black/60',
  },
  {
    title: 'Vídeo y lyric videos',
    description:
      'Edición audiovisual, montaje y piezas de letras animadas pensadas para canciones, lanzamientos y redes.',
    icon: Clapperboard,
    tone: 'bg-[#111111] text-white',
    muted: 'text-white/60',
  },
  {
    title: 'Voz y colaboración musical',
    description:
      'Trabajo vocal y colaboración como cantante dentro de producciones musicales y proyectos creativos.',
    icon: Mic2,
    tone: 'bg-[#ff4d00] text-black',
    muted: 'text-black/65',
  },
];

const structuredData = [
  {
    '@type': 'CollectionPage',
    '@id': `${absoluteUrl('/services')}#webpage`,
    url: absoluteUrl('/services'),
    name: 'Servicios creativos y desarrollo de software | RubnPneal',
    description:
      'Servicios de desarrollo de software, música, mezcla, ilustración, vídeo y colaboración creativa de Rubn Pneal.',
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    author: { '@id': `${SITE_ORIGIN}/#person` },
    inLanguage: 'es',
    mainEntity: { '@id': `${absoluteUrl('/services')}#services` },
  },
  {
    '@type': 'ItemList',
    '@id': `${absoluteUrl('/services')}#services`,
    itemListElement: services.map((service, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Service',
        name: service.title,
        description: service.description,
        provider: { '@id': `${SITE_ORIGIN}/#person` },
        url: absoluteUrl('/services'),
      },
    })),
  },
  breadcrumbStructuredData([
    { name: 'Inicio', path: '/' },
    { name: 'Servicios', path: '/services' },
  ]),
];

export default function ServicesPage() {
  const mailto = `mailto:${EMAIL}?subject=Proyecto%20desde%20RubnPneal%20Works`;

  return (
    <>
      <Seo
        title="Servicios creativos y desarrollo de software | RubnPneal"
        description="Servicios de Rubn Pneal: desarrollo de software .NET, composición y producción musical, mezcla, ilustración, vídeo, lyric videos y colaboración vocal."
        path="/services"
        structuredData={structuredData}
      />

      <div className="bg-[#f5f2e8]">
        <SectionLayout eyebrow="Contratación" title="Servicios">
          <div className="grid overflow-hidden border border-black/15 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="p-7 sm:p-10 lg:p-12">
              <p className="max-w-4xl text-3xl font-medium leading-tight tracking-[-0.03em] sm:text-4xl lg:text-5xl">
                Puedo entrar en un proyecto desde la parte técnica, musical o
                visual, o combinar varias cuando el trabajo lo pide.
              </p>
            </div>
            <div className="flex flex-col justify-between bg-[#ff4d00] p-7 sm:p-10 lg:p-12">
              <p className="max-w-xl text-base leading-7 text-black/70">
                Cada encargo se define según alcance, tiempos y entregables. La
                prioridad es dejar claro desde el principio qué se va a hacer y
                qué resultado necesitas.
              </p>
              <div className="mt-12 border-t border-black/25 pt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-black/55">
                Software · Audio · Imagen
              </div>
            </div>
          </div>
        </SectionLayout>

        <section className="mx-auto max-w-[1440px] px-5 pb-20 sm:px-8 sm:pb-28 lg:px-12">
          <div className="grid gap-px bg-black/15 md:grid-cols-2 xl:grid-cols-3">
            {services.map(
              ({ title, description, icon: Icon, tone, muted }, index) => (
                <article
                  key={title}
                  className={`min-h-[320px] p-7 sm:p-9 ${tone}`}
                >
                  <div className="flex items-start justify-between">
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                    <span className="font-mono text-[11px] opacity-40">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h2 className="display-title mt-16 text-3xl sm:text-4xl">
                    {title}
                  </h2>
                  <p className={`mt-4 text-sm leading-6 sm:text-base ${muted}`}>
                    {description}
                  </p>
                </article>
              ),
            )}
          </div>
        </section>

        <section className="bg-[#111111] text-white">
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-end lg:px-12">
            <div>
              <p className="eyebrow text-white/45">Contacto</p>
              <h2 className="display-title mt-4 max-w-4xl text-5xl sm:text-7xl">
                Cuéntame qué quieres hacer.
              </h2>
              <a
                href={mailto}
                className="mt-7 inline-flex items-center gap-2 text-base text-white/65 transition-colors hover:text-white sm:text-lg"
              >
                <Mail className="h-4 w-4" />
                {EMAIL}
              </a>
            </div>
            <a href={mailto} className="button-light shrink-0">
              Escribir por email <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
