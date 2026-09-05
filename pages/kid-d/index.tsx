import Image from 'next/image';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import SectionLayout from '@components/SectionLayout';
import Seo from '@components/Seo';
import { absoluteUrl, breadcrumbStructuredData, SITE_ORIGIN } from '@/lib/seo';

const INSTAGRAM_USER = 'kid.d232';
const TIKTOK_USER = 'kiddaccount23';
const DEVIANTART_USER = 'treska23';

const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_USER}/`;
const TIKTOK_URL = `https://www.tiktok.com/@${TIKTOK_USER}`;
const DEVIANTART_URL = `https://www.deviantart.com/${DEVIANTART_USER}`;
const DEVIANTART_RSS = `https://backend.deviantart.com/rss.xml?q=gallery%3A${DEVIANTART_USER}&type=deviation`;

type DeviantArtWork = {
  title: string;
  link: string;
  image: string;
};

function decodeXml(value: string) {
  return value
    .replace(/^<!\[CDATA\[/, '')
    .replace(/\]\]>$/, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function extractTag(block: string, tag: string) {
  const match = block.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'),
  );
  return match?.[1] ? decodeXml(match[1]) : '';
}

function parseDeviantArtWorks(xml: string) {
  return Array.from(xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi))
    .slice(0, 9)
    .map((match) => {
      const block = match[1];
      const mediaContent = block.match(
        /<media:content\b[^>]*\burl=(['"])(.*?)\1/i,
      )?.[2];
      const mediaThumbnail = block.match(
        /<media:thumbnail\b[^>]*\burl=(['"])(.*?)\1/i,
      )?.[2];

      return {
        title: extractTag(block, 'title') || 'Obra en DeviantArt',
        link: extractTag(block, 'link') || DEVIANTART_URL,
        image: decodeXml(mediaContent || mediaThumbnail || ''),
      };
    })
    .filter((work) => Boolean(work.image));
}

export async function getStaticProps() {
  try {
    const response = await fetch(DEVIANTART_RSS);
    if (!response.ok) {
      throw new Error(`DeviantArt RSS returned ${response.status}`);
    }

    const xml = await response.text();
    const works = parseDeviantArtWorks(xml);

    return { props: { works }, revalidate: 3600 };
  } catch (error) {
    console.error('Failed to fetch DeviantArt gallery:', error);
    return { props: { works: [] }, revalidate: 3600 };
  }
}

export default function KidDPage({ works }: { works: DeviantArtWork[] }) {
  const [deviantArtWorks, setDeviantArtWorks] = useState(works);
  const [isLoadingDeviantArt, setIsLoadingDeviantArt] = useState(
    works.length === 0,
  );
  const structuredData = [
    {
      '@type': 'CollectionPage',
      '@id': `${absoluteUrl('/kid-d')}#webpage`,
      url: absoluteUrl('/kid-d'),
      name: 'Kid D | Ilustración, dibujo y arte en redes',
      description:
        'Portfolio visual de Kid D con dibujo, ilustración, procesos y publicaciones de Instagram, TikTok y DeviantArt.',
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      author: { '@id': `${SITE_ORIGIN}/#person` },
      inLanguage: 'es',
      mainEntity: { '@id': `${absoluteUrl('/kid-d')}#gallery` },
    },
    {
      '@type': 'ItemList',
      '@id': `${absoluteUrl('/kid-d')}#gallery`,
      itemListElement: works.map((work, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'ImageObject',
          name: work.title,
          contentUrl: work.image,
          url: work.link,
          creator: { '@id': `${SITE_ORIGIN}/#person` },
        },
      })),
    },
    breadcrumbStructuredData([
      { name: 'Inicio', path: '/' },
      { name: 'Kid D', path: '/kid-d' },
    ]),
  ];

  useEffect(() => {
    const controller = new AbortController();

    async function refreshDeviantArtWorks() {
      try {
        const response = await fetch(DEVIANTART_RSS, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`DeviantArt RSS returned ${response.status}`);
        }

        const refreshedWorks = parseDeviantArtWorks(await response.text());
        if (refreshedWorks.length > 0) {
          setDeviantArtWorks(refreshedWorks);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn(
            'Could not refresh the DeviantArt gallery in the browser:',
            error,
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingDeviantArt(false);
        }
      }
    }

    void refreshDeviantArtWorks();
    return () => controller.abort();
  }, []);

  return (
    <>
      <Seo
        title="Kid D | Ilustración, dibujo y arte en redes"
        description="Descubre el portfolio visual de Kid D: dibujos, ilustración, procesos y últimas obras publicadas por Rubn Pneal en Instagram, TikTok y DeviantArt."
        path="/kid-d"
        structuredData={structuredData}
      />

      <div className="bg-[#0b0b0b] text-white">
        <SectionLayout eyebrow="Dibujo · Redes · Proceso" title="Kid D">
          <div className="grid gap-10 border-t border-white/15 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
            <p className="max-w-4xl text-3xl font-medium leading-tight tracking-[-0.04em] sm:text-4xl lg:text-6xl">
              El lado más inmediato del trabajo visual: dibujos, procesos y
              piezas que viven en redes.
            </p>
            <p className="max-w-xl text-base leading-7 text-white/55">
              Esta sección reúne Instagram, TikTok y DeviantArt en un mismo
              sitio. No es una lista de enlaces: el contenido visual forma parte
              del portfolio y las plataformas quedan como puerta de entrada al
              material completo.
            </p>
          </div>
        </SectionLayout>

        <section className="mx-auto max-w-[1440px] px-5 pb-20 sm:px-8 sm:pb-28 lg:px-12">
          <div className="grid gap-px overflow-hidden bg-white/15 lg:grid-cols-3">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="group relative min-h-[300px] overflow-hidden bg-[#dc2f77] p-7 sm:p-9"
            >
              <div className="absolute inset-0 grid grid-cols-3 opacity-55 transition-transform duration-700 group-hover:scale-[1.03]">
                {[
                  '/hero/rubnpneal-portfolio-visual.webp',
                  '/hero/comic-cuando-los-arboles-dejaron-de-hablar.webp',
                  '/hero/rubnpneal-musica-produccion.webp',
                ].map((src) => (
                  <div key={src} className="relative overflow-hidden">
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="20vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/20" />
              <div className="relative z-10 flex h-full min-h-[230px] flex-col justify-between">
                <div className="flex items-start justify-between text-xs font-semibold uppercase tracking-[0.16em]">
                  <span>Instagram</span>
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <div>
                  <p className="display-title text-4xl sm:text-5xl">
                    @{INSTAGRAM_USER}
                  </p>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-white/65">
                    Dibujos, piezas terminadas y publicaciones visuales.
                  </p>
                </div>
              </div>
            </a>

            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noreferrer"
              className="group relative min-h-[300px] overflow-hidden bg-[#111] p-7 sm:p-9"
            >
              <div className="absolute -right-14 -top-12 h-56 w-56 rounded-full bg-[#25f4ee]/30 blur-3xl transition-transform duration-700 group-hover:scale-125" />
              <div className="absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-[#fe2c55]/30 blur-3xl transition-transform duration-700 group-hover:scale-125" />
              <div className="relative z-10 flex h-full min-h-[230px] flex-col justify-between">
                <div className="flex items-start justify-between text-xs font-semibold uppercase tracking-[0.16em]">
                  <span>TikTok</span>
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <div>
                  <p className="display-title text-4xl sm:text-5xl">
                    @{TIKTOK_USER}
                  </p>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-white/60">
                    Vídeo corto, animación y proceso de dibujo.
                  </p>
                </div>
              </div>
            </a>

            <a
              href={DEVIANTART_URL}
              target="_blank"
              rel="noreferrer"
              className="group relative min-h-[300px] overflow-hidden bg-[#05cc47] p-7 text-black sm:p-9"
            >
              <div className="absolute -right-10 top-12 text-[11rem] font-black leading-none tracking-[-0.12em] text-black/10 transition-transform duration-700 group-hover:-translate-x-3">
                dA
              </div>
              <div className="relative z-10 flex h-full min-h-[230px] flex-col justify-between">
                <div className="flex items-start justify-between text-xs font-semibold uppercase tracking-[0.16em]">
                  <span>DeviantArt</span>
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <div>
                  <p className="display-title text-4xl sm:text-5xl">
                    {DEVIANTART_USER}
                  </p>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-black/65">
                    Galería completa y archivo de trabajos visuales.
                  </p>
                </div>
              </div>
            </a>
          </div>
        </section>
      </div>

      <section className="bg-[#c13584] text-white">
        <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-white/25 pb-6">
            <div>
              <p className="eyebrow text-white/65">Instagram</p>
              <h2 className="display-title mt-4 text-4xl sm:text-6xl">
                Últimas publicaciones
              </h2>
            </div>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border-b border-white pb-1 text-sm font-semibold"
            >
              Abrir Instagram <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mx-auto max-w-[900px] overflow-hidden border border-white/25 bg-white p-1 shadow-2xl shadow-black/25">
            <iframe
              src={`${INSTAGRAM_URL}embed/`}
              title={`Últimas publicaciones de @${INSTAGRAM_USER} en Instagram`}
              className="block h-[820px] w-full bg-white"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#f5f2e8] text-black">
        <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-black/15 pb-6">
            <div>
              <p className="eyebrow">TikTok</p>
              <h2 className="display-title mt-4 text-4xl sm:text-6xl">
                Últimos vídeos
              </h2>
            </div>
            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border-b border-black pb-1 text-sm font-semibold"
            >
              Abrir TikTok <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mx-auto max-w-[760px]">
            <blockquote
              className="tiktok-embed"
              cite={TIKTOK_URL}
              data-unique-id={TIKTOK_USER}
              data-embed-type="creator"
              style={{ maxWidth: '720px', minWidth: '288px' }}
            >
              <section>
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`${TIKTOK_URL}?refer=creator_embed`}
                >
                  @{TIKTOK_USER}
                </a>
              </section>
            </blockquote>
            <Script
              src="https://www.tiktok.com/embed.js"
              strategy="afterInteractive"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#111] text-white">
        <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-white/15 pb-6">
            <div>
              <p className="eyebrow text-white/45">DeviantArt · RSS</p>
              <h2 className="display-title mt-4 text-4xl sm:text-6xl">
                Últimas obras
              </h2>
            </div>
            <a
              href={DEVIANTART_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border-b border-white pb-1 text-sm font-semibold"
            >
              Ver galería completa <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          {deviantArtWorks.length > 0 ? (
            <div className="grid gap-px bg-white/15 sm:grid-cols-2 lg:grid-cols-3">
              {deviantArtWorks.map((work) => (
                <a
                  key={`${work.link}-${work.title}`}
                  href={work.link}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-[4/5] overflow-hidden bg-[#1b1b1b]"
                >
                  <img
                    src={work.image}
                    alt={work.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-6">
                    <h3 className="max-w-[85%] text-lg font-semibold leading-snug">
                      {work.title}
                    </h3>
                    <ArrowUpRight className="h-5 w-5 shrink-0" />
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="border-y border-white/15 py-14 text-white/55">
              {isLoadingDeviantArt
                ? 'Cargando la galería de DeviantArt…'
                : 'La galería automática de DeviantArt no ha respondido ahora mismo. El acceso directo al perfil sigue disponible arriba.'}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
