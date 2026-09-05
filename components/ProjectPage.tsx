import Link from 'next/link';
import SectionLayout from '@components/SectionLayout';
import Seo from '@components/Seo';
import { projects } from '@/lib/projects';
import { absoluteUrl, breadcrumbStructuredData, SITE_ORIGIN } from '@/lib/seo';

export default function ProjectPage({ slug }: { slug: string }) {
  const project = projects.find((item) => item.slug === slug);
  if (!project) throw new Error(`Unknown project: ${slug}`);
  const path = `/development/${project.slug}`;
  return (
    <>
      <Seo
        title={project.title}
        description={project.description}
        path={path}
        structuredData={[
          {
            '@type': 'WebPage',
            '@id': `${absoluteUrl(path)}#webpage`,
            url: absoluteUrl(path),
            name: project.title,
            description: project.description,
            inLanguage: 'es',
            author: { '@id': `${SITE_ORIGIN}/#person` },
          },
          breadcrumbStructuredData([
            { name: 'Inicio', path: '/' },
            { name: 'Programación', path: '/development' },
            { name: project.name, path },
          ]),
        ]}
      />
      <div className="bg-[#0b0b0b] text-white">
        <SectionLayout eyebrow={project.status} title={project.name}>
          <Link
            href="/development"
            className="text-sm text-white/65 underline underline-offset-4"
          >
            Todos los proyectos
          </Link>
          <p className="mt-8 max-w-4xl text-2xl leading-relaxed sm:text-3xl">
            {project.intro}
          </p>
          <a
            href={`${project.href}#readme`}
            target="_blank"
            rel="noreferrer"
            className="button-light mt-8"
          >
            Ver código e instrucciones
          </a>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">
            Proyecto de Rubn Pneal. Las instrucciones de instalación y el
            estado actual se mantienen en su repositorio.
          </p>
          <div className="mt-14 grid gap-8 border-t border-white/15 pt-10 lg:grid-cols-3">
            {project.uses.map(([title, text]) => (
              <section key={title}>
                <h2 className="text-2xl font-semibold">{title}</h2>
                <p className="mt-4 text-base leading-7 text-white/65">{text}</p>
              </section>
            ))}
          </div>
          <section className="mt-14 border-t border-white/15 pt-10">
            <h2 className="text-3xl font-semibold">
              Qué necesitas para probarlo
            </h2>
            <p className="mt-5 max-w-4xl text-base leading-7 text-white/65">
              {project.requirements}
            </p>
            <h3 className="mt-8 text-xl font-semibold">Primer paso</h3>
            <p className="mt-3 max-w-4xl text-base leading-7 text-white/65">
              {project.start}
            </p>
          </section>
          <section className="mt-14 border-t border-white/15 pt-10">
            <h2 className="text-3xl font-semibold">Preguntas frecuentes</h2>
            {project.faqs.map(([question, answer]) => (
              <div key={question} className="mt-7 max-w-4xl">
                <h3 className="text-xl font-semibold">{question}</h3>
                <p className="mt-3 text-base leading-7 text-white/65">
                  {answer}
                </p>
              </div>
            ))}
          </section>
          <nav
            aria-label="Otros proyectos"
            className="mt-14 flex flex-wrap gap-6 border-t border-white/15 pt-8"
          >
            {projects
              .filter((item) => item.slug !== project.slug)
              .map((item) => (
                <Link
                  key={item.slug}
                  href={`/development/${item.slug}`}
                  className="text-base underline underline-offset-4"
                >
                  {item.name}
                </Link>
              ))}
          </nav>
          {project.slug === 'tinta-es' && (
            <p className="mt-10 text-base leading-7 text-white/65">
              Si te interesa la narrativa gráfica, también puedes{' '}
              <Link
                href="/comic"
                className="text-white underline underline-offset-4"
              >
                leer completo mi cómic Cuando los Árboles Dejaron de Hablar
              </Link>
              .
            </p>
          )}
        </SectionLayout>
      </div>
    </>
  );
}
