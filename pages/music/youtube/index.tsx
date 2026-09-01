import Link from 'next/link';
import Parser from 'rss-parser';
import { ArrowLeft, ArrowUpRight, Youtube } from 'lucide-react';
import SectionLayout from '@components/SectionLayout';
import Seo from '@components/Seo';
import { absoluteUrl, breadcrumbStructuredData, SITE_ORIGIN } from '@/lib/seo';

const CHANNEL_ID = 'UCAyA9gTo-GPaKNnlulvS8iw';
type YouTubeVideo = { id: string; title: string; publishedAt: string | null };

export async function getStaticProps() {
  try {
    const feed = await new Parser().parseURL(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
    );
    const videos: YouTubeVideo[] = feed.items
      .map((item) => ({
        id: item.link?.split('v=')[1]?.split('&')[0] ?? '',
        title: item.title ?? 'Vídeo musical',
        publishedAt: item.isoDate ?? item.pubDate ?? null,
      }))
      .filter((video) => Boolean(video.id));

    return { props: { videos }, revalidate: 3600 };
  } catch (error) {
    console.error('Failed to fetch YouTube RSS feed:', error);
    return { props: { videos: [] }, revalidate: 3600 };
  }
}

export default function YouTubeMusicPage({
  videos,
}: {
  videos: YouTubeVideo[];
}) {
  const videoStructuredData = videos
    .filter((video) => Boolean(video.publishedAt))
    .map((video) => ({
      '@type': 'VideoObject',
      name: video.title,
      description: `${video.title}, vídeo musical publicado por Rubén Pneal en YouTube.`,
      thumbnailUrl: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
      uploadDate: video.publishedAt,
      embedUrl: `https://www.youtube.com/embed/${video.id}`,
      contentUrl: `https://www.youtube.com/watch?v=${video.id}`,
      publisher: { '@id': `${SITE_ORIGIN}/#person` },
    }));
  const structuredData = [
    {
      '@type': 'CollectionPage',
      '@id': `${absoluteUrl('/music/youtube')}#webpage`,
      url: absoluteUrl('/music/youtube'),
      name: 'Vídeos musicales de RubnPneal en YouTube',
      description:
        'Vídeos musicales, canciones y piezas audiovisuales de Rubén Pneal.',
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      author: { '@id': `${SITE_ORIGIN}/#person` },
      inLanguage: 'es',
      mainEntity: videoStructuredData,
    },
    ...videoStructuredData,
    breadcrumbStructuredData([
      { name: 'Inicio', path: '/' },
      { name: 'Música', path: '/music' },
      { name: 'YouTube', path: '/music/youtube' },
    ]),
  ];

  return (
    <>
      <Seo
        title="Vídeos musicales de RubnPneal en YouTube"
        description="Descubre los vídeos musicales, canciones y piezas audiovisuales de Rubén Pneal, con las últimas publicaciones de su canal de YouTube."
        path="/music/youtube"
        structuredData={structuredData}
      />

      <div className="min-h-screen bg-[#0b0b0b] text-white">
        <section className="bg-[#ff0000] text-black">
          <SectionLayout className="pb-14 sm:pb-16 lg:pb-20">
            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/55">
              <Youtube className="h-5 w-5" strokeWidth={2} />
              <span>Música / YouTube</span>
            </div>

            <div className="mt-5 grid gap-8 border-t border-black/20 pt-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <h1 className="display-title text-6xl sm:text-7xl lg:text-8xl">
                  YouTube
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-black/65 sm:text-lg">
                  Vídeos musicales, lanzamientos y piezas publicadas en el canal
                  de RubnPneal.
                </p>
              </div>

              <a
                href={`https://www.youtube.com/channel/${CHANNEL_ID}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border-b border-black pb-1 text-sm font-semibold"
              >
                Abrir canal <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </SectionLayout>
        </section>

        <section className="bg-[#0b0b0b]">
          <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-6">
              <Link
                href="/music"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" /> Música
              </Link>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#ff0000]">
                Últimas publicaciones
              </span>
            </div>

            {videos.length === 0 ? (
              <div className="border-y border-white/15 py-16 text-white/50">
                No se pudieron cargar los vídeos en este momento.
              </div>
            ) : (
              <div className="grid gap-x-6 gap-y-10 md:grid-cols-2">
                {videos.map((video, index) => (
                  <article key={video.id} className="group">
                    <div className="aspect-video overflow-hidden border border-white/10 bg-black shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                      <iframe
                        className="h-full w-full"
                        src={`https://www.youtube.com/embed/${video.id}?rel=0`}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                    <div className="mt-4 flex gap-4 border-t border-[#ff0000]/60 pt-4">
                      <span className="font-mono text-[11px] text-[#ff0000]">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h2 className="text-lg font-semibold leading-snug text-white/90">
                        {video.title}
                      </h2>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
