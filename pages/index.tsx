import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import AboutAuthor from '@components/AboutAuthor';

const selectedWork = [
  {
    number: '01',
    title: 'Programación',
    description:
      'Aplicaciones .NET, herramientas de escritorio, audio, automatización e IA local.',
    href: '/development',
    tone: 'bg-[#171717] text-white',
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Visual_Studio_Icon_2022.svg/960px-Visual_Studio_Icon_2022.svg.png',
    imageClassName:
      'object-contain bg-[#17111f] p-14 transition-transform duration-700 group-hover:scale-[1.04] sm:p-20',
  },
  {
    number: '02',
    title: 'Cómic',
    description: 'Narrativa gráfica, dibujo e ilustración de autor.',
    href: '/comic',
    image: '/hero/slide2.jpg',
    imageClassName:
      'object-cover transition-transform duration-700 group-hover:scale-[1.025]',
  },
  {
    number: '03',
    title: 'Música',
    description: 'Composición, producción y trabajos publicados en plataformas.',
    href: '/music',
    image: '/hero/slide3.jpg',
    imageClassName:
      'object-cover transition-transform duration-700 group-hover:scale-[1.025]',
  },
];

export default function Home() {
  return (
    <>
      <Head>
        <title>RubnPneal — Software, música e imagen</title>
        <meta
          name="description"
          content="Portfolio de RubnPneal: programación, música, ilustración y cómic."
        />
      </Head>

      <section className="bg-[#0b0b0b] text-[#f5f2e8]">
        <div className="mx-auto grid min-h-[calc(100svh-72px)] max-w-[1440px] lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col justify-between px-5 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
            <div className="flex items-center justify-between border-b border-white/15 pb-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
              <span>Portfolio multidisciplinar</span>
              <span>2026</span>
            </div>

            <div className="py-16 lg:py-20">
              <p className="eyebrow text-white/45">Rubén Pneal</p>
              <h1 className="mt-5 max-w-5xl text-[clamp(4rem,9vw,9rem)] font-semibold leading-[0.82] tracking-[-0.065em]">
                Software,
                <br />
                sonido e imagen.
              </h1>
              <p className="mt-8 max-w-xl text-base leading-7 text-white/60 sm:text-lg">
                Desarrollo de software y trabajo creativo reunidos en un mismo portfolio:
                programación, música, ilustración y narrativa gráfica.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="#trabajos" className="button-light">
                  Ver trabajos <ArrowDownRight className="h-4 w-4" />
                </Link>
                <Link href="/services" className="button-ghost-light">
                  Contratación <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-white/15 pt-5 text-[11px] uppercase tracking-[0.18em] text-white/45 sm:grid-cols-3">
              <span>Programación</span>
              <span>Música</span>
              <span>Ilustración</span>
            </div>
          </div>

          <div className="relative min-h-[55svh] overflow-hidden border-t border-white/10 lg:min-h-0 lg:border-l lg:border-t-0">
            <Image
              src="/hero/slide1.jpg"
              alt="Trabajo visual de RubnPneal"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between border-t border-white/40 pt-4 text-[11px] uppercase tracking-[0.18em] text-white/75 sm:bottom-10 sm:left-10 sm:right-10">
              <span>Creative + technical work</span>
              <span>Selected 01</span>
            </div>
          </div>
        </div>
      </section>

      <section id="trabajos" className="bg-[#f5f2e8]">
        <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="mb-12 flex items-end justify-between gap-8 border-b border-black/15 pb-6 sm:mb-16">
            <div>
              <p className="eyebrow">Trabajo seleccionado</p>
              <h2 className="display-title mt-4 text-4xl sm:text-6xl">Lo que hago</h2>
            </div>
            <p className="hidden max-w-sm text-sm leading-6 text-black/55 md:block">
              Menos decoración, más trabajo real. Cada área lleva a una selección
              específica del portfolio.
            </p>
          </div>

          <div className="grid gap-px bg-black/15 md:grid-cols-2 xl:grid-cols-3">
            {selectedWork.map((item) => (
              <Link
                href={item.href}
                key={item.title}
                className={`group relative min-h-[440px] overflow-hidden bg-[#ede9dd] p-7 sm:p-9 ${item.tone ?? ''}`}
              >
                {item.image && (
                  <>
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className={item.imageClassName}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/15" />
                  </>
                )}
                <div
                  className={`relative z-10 flex h-full min-h-[372px] flex-col justify-between ${
                    item.image ? 'text-white' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold tracking-[0.16em] opacity-60">
                      {item.number}
                    </span>
                    <ArrowUpRight className="h-5 w-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
                  </div>
                  <div>
                    {!item.image && (
                      <div className="mb-12 font-mono text-xs uppercase leading-7 tracking-[0.14em] text-white/35">
                        C# / .NET / WPF
                        <br />
                        LOCAL AI / AUDIO
                        <br />
                        AUTOMATION / TOOLS
                      </div>
                    )}
                    <h3 className="display-title text-5xl sm:text-6xl">{item.title}</h3>
                    <p className="mt-4 max-w-md text-sm leading-6 opacity-70 sm:text-base">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-black/10 bg-[#f5f2e8]">
        <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <AboutAuthor />
        </div>
      </section>
      <section className="bg-[#ff4d00] text-black">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:flex-row lg:items-end lg:justify-between lg:px-12">
          <h2 className="display-title max-w-4xl text-5xl sm:text-7xl lg:text-8xl">
            ¿Tienes un proyecto en mente?
          </h2>
          <Link href="/services" className="button-dark shrink-0">
            Trabajemos juntos <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
