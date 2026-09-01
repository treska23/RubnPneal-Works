import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Music2 } from 'lucide-react';
import SectionLayout from '@components/SectionLayout';
import Seo from '@components/Seo';
import { absoluteUrl, breadcrumbStructuredData, SITE_ORIGIN } from '@/lib/seo';

const trackIds = [
  '5Q3jx7MeOdXMORcYRVrZCr',
  '2ZR3fNmXvvCEM7c1NBQc8I',
  '29SF1Np1YcHL2do0yn2WP9',
  '6aeQRm0Hmimiq8H2eX57PN',
  '0ilhM3zao9dvKNKxcvoAD9',
  '39M28XOz5rULAbErpccwZk',
  '2Xypqm0teQLY1ECaS2UWIL',
  '62FmlTMhpE1G1fGcDMAdOf',
  '4GIkmAY5pQrEGavCtxe5e3',
];
const ARTIST_ID = '24cB9jl7geMfGyDiW29KlY';

type SpotifyTrack = { id: string; title: string };

export async function getStaticProps() {
  const tracks = await Promise.all(
    trackIds.map(async (id, index): Promise<SpotifyTrack> => {
      try {
        const url = `https://open.spotify.com/track/${id}`;
        const response = await fetch(
          `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
        );
        if (!response.ok)
          throw new Error(`Spotify oEmbed returned ${response.status}`);
        const data = (await response.json()) as { title?: string };
        return {
          id,
          title: data.title?.trim() || `Canción ${index + 1} de RubnPneal`,
        };
      } catch {
        return { id, title: `Canción ${index + 1} de RubnPneal` };
      }
    }),
  );

  return { props: { tracks }, revalidate: 86400 };
}

export default function SpotifyPage({ tracks }: { tracks: SpotifyTrack[] }) {
  const structuredData = [
    {
      '@type': 'CollectionPage',
      '@id': `${absoluteUrl('/music/spotify')}#webpage`,
      url: absoluteUrl('/music/spotify'),
      name: 'Canciones de RubnPneal en Spotify | Discografía',
      description:
        'Discografía y canciones publicadas por Rubén Pneal en Spotify.',
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      author: { '@id': `${SITE_ORIGIN}/#person` },
      inLanguage: 'es',
      mainEntity: { '@id': `${absoluteUrl('/music/spotify')}#tracks` },
    },
    {
      '@type': 'ItemList',
      '@id': `${absoluteUrl('/music/spotify')}#tracks`,
      itemListElement: tracks.map((track, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'MusicRecording',
          name: track.title,
          url: `https://open.spotify.com/track/${track.id}`,
          byArtist: { '@id': `${SITE_ORIGIN}/#person` },
        },
      })),
    },
    breadcrumbStructuredData([
      { name: 'Inicio', path: '/' },
      { name: 'Música', path: '/music' },
      { name: 'Spotify', path: '/music/spotify' },
    ]),
  ];

  return (
    <>
      <Seo
        title="Canciones de RubnPneal en Spotify | Discografía"
        description="Escucha la discografía de Rubén Pneal en Spotify: canciones originales, composición y producción musical reunidas en su perfil de artista."
        path="/music/spotify"
        structuredData={structuredData}
      />

      <div className="min-h-screen bg-[#121212] text-white">
        <section className="bg-[#1ed760] text-black">
          <SectionLayout className="pb-14 sm:pb-16 lg:pb-20">
            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/55">
              <Music2 className="h-5 w-5" strokeWidth={2} />
              <span>Música / Spotify</span>
            </div>

            <div className="mt-5 grid gap-8 border-t border-black/20 pt-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <h1 className="display-title text-6xl sm:text-7xl lg:text-8xl">
                  Spotify
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-black/65 sm:text-lg">
                  Discografía, canciones publicadas y acceso directo al perfil
                  de artista.
                </p>
              </div>

              <a
                href={`https://open.spotify.com/artist/${ARTIST_ID}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border-b border-black pb-1 text-sm font-semibold"
              >
                Abrir perfil en Spotify <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </SectionLayout>
        </section>

        <section className="bg-[#121212]">
          <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-6">
              <Link
                href="/music"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" /> Música
              </Link>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#1ed760]">
                Discografía
              </span>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="overflow-hidden border border-white/10 bg-[#181818] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.28)] transition-transform duration-300 hover:-translate-y-1"
                >
                  <iframe
                    className="block w-full"
                    style={{ borderRadius: '8px' }}
                    src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0`}
                    height="352"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    title={`${track.title} en Spotify`}
                  />
                </div>
              ))}
            </div>

            <div className="mt-16 border-t border-[#1ed760]/45 pt-10">
              <div className="mb-6 flex items-center justify-between gap-4">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1ed760]">
                  Perfil de artista
                </p>
                <ArrowUpRight className="h-4 w-4 text-[#1ed760]" />
              </div>
              <div className="overflow-hidden border border-white/10 bg-[#181818] p-2">
                <iframe
                  className="block w-full"
                  style={{ borderRadius: '8px' }}
                  src={`https://open.spotify.com/embed/artist/${ARTIST_ID}?utm_source=generator&theme=0`}
                  height="352"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  title="Perfil de artista de RubnPneal en Spotify"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
