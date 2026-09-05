import { ArrowUpRight, Github } from 'lucide-react';
import Link from 'next/link';
import SectionLayout from '@components/SectionLayout';
import Seo from '@components/Seo';
import { absoluteUrl, breadcrumbStructuredData, SITE_ORIGIN } from '@/lib/seo';
import { projects } from '@/lib/projects';

const capabilities = [
  ['Aplicaciones desktop', 'C# / .NET / WPF / MVVM'],
  ['Datos e integración', 'REST APIs / SQL Server / automatización'],
  ['Audio', 'MIDI / ASIO / VST3 / procesamiento'],
  ['IA local', 'Ollama / modelos locales / flujos privados'],
];

const structuredData = [
  {
    '@type': 'CollectionPage',
    '@id': `${absoluteUrl('/development')}#webpage`,
    url: absoluteUrl('/development'),
    name: 'Desarrollo de software .NET e IA local | RubnPneal',
    description:
      'Proyectos de software para Windows, audio, automatización e inteligencia artificial local desarrollados por Rubén Pneal.',
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    author: { '@id': `${SITE_ORIGIN}/#person` },
    inLanguage: 'es',
    mainEntity: { '@id': `${absoluteUrl('/development')}#projects` },
  },
  {
    '@type': 'ItemList',
    '@id': `${absoluteUrl('/development')}#projects`,
    itemListElement: projects.map((project, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'SoftwareApplication',
        name: project.name,
        url: absoluteUrl(`/development/${project.slug}`),
        description: project.description,
        codeRepository: project.href,
        author: { '@id': `${SITE_ORIGIN}/#person` },
      },
    })),
  },
  breadcrumbStructuredData([
    { name: 'Inicio', path: '/' },
    { name: 'Programación', path: '/development' },
  ]),
];

export default function DevelopmentPage() {
  return (
    <>
      <Seo
        title="Desarrollo de software .NET e IA local | RubnPneal"
        description="Proyectos de Rubén Pneal en C#, .NET, WPF, audio, automatización e IA local: Tinta ES, Drum Practice Studio y ControlPCIA."
        path="/development"
        structuredData={structuredData}
      />

      <div className="bg-[#0b0b0b] text-white">
        <SectionLayout eyebrow="Software" title="Programación">
          <div className="grid gap-10 border-t border-white/15 pt-8 lg:grid-cols-[1.3fr_0.7fr] lg:gap-20">
            <p className="max-w-4xl text-3xl font-medium leading-tight tracking-[-0.03em] sm:text-4xl lg:text-5xl">
              Desarrollo herramientas centradas en problemas reales: escritorio,
              automatización, audio e inteligencia artificial local.
            </p>
            <p className="max-w-xl text-base leading-7 text-white/60 lg:pt-2">
              El foco está en la arquitectura, el comportamiento de la
              aplicación y una interfaz clara. Los proyectos de esta selección
              son software funcional, no demos visuales aisladas.
            </p>
          </div>
        </SectionLayout>

        <section className="mx-auto max-w-[1440px] px-5 pb-20 sm:px-8 sm:pb-28 lg:px-12">
          <div className="border-t border-white/15">
            {projects.map((project, index) => (
              <article
                key={project.name}
                className="grid gap-8 border-b border-white/15 py-10 lg:grid-cols-[100px_1fr_1.2fr_auto] lg:items-start lg:gap-10 lg:py-14"
              >
                <span className="font-mono text-xs text-white/35">
                  0{index + 1}
                </span>
                <div>
                  <p className="eyebrow text-white/45">{project.status}</p>
                  <h2 className="display-title mt-3 text-4xl text-white sm:text-5xl">
                    <Link
                      href={`/development/${project.slug}`}
                      className="hover:underline"
                    >
                      {project.name}
                    </Link>
                  </h2>
                </div>
                <div>
                  <p className="max-w-2xl text-base leading-7 text-white/65">
                    {project.description}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="border border-white/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href={`/development/${project.slug}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 transition-colors hover:text-white/65"
                >
                  Ver proyecto <ArrowUpRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#141414] text-white">
          <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
              <div>
                <p className="eyebrow text-white/45">Perfil técnico</p>
                <h2 className="display-title mt-4 text-4xl sm:text-6xl">
                  Tecnología al servicio del uso.
                </h2>
              </div>
              <div className="border-t border-white/15">
                {capabilities.map(([title, value]) => (
                  <div
                    key={title}
                    className="grid gap-2 border-b border-white/15 py-6 sm:grid-cols-[0.8fr_1.2fr]"
                  >
                    <span className="text-sm font-semibold">{title}</span>
                    <span className="text-sm leading-6 text-white/55">
                      {value}
                    </span>
                  </div>
                ))}
                <a
                  href="https://github.com/treska23"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-8 inline-flex items-center gap-2 border-b border-white pb-1 text-sm font-semibold"
                >
                  <Github className="h-4 w-4" /> Ver GitHub completo{' '}
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
