import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Music2 } from 'lucide-react';
import SectionLayout from '@components/SectionLayout';

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

export default function SpotifyPage() {
  return (
    <>
      <Head>
        <title>Spotify — RubnPneal</title>
        <meta name="description" content="Canciones de RubnPneal en Spotify." />
      </Head>

      <div className="min-h-screen bg-[#121212] text-white">
        <section className="bg-[#1ed760] text-black">
          <SectionLayout className="pb-14 sm:pb-16 lg:pb-20">
            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/55">
              <Music2 className="h-5 w-5" strokeWidth={2} />
              <span>Música / Spotify</span>
            </div>

            <div className="mt-5 grid gap-8 border-t border-black/20 pt-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <h1 className="display-title text-6xl sm:text-7xl lg:text-8xl">Spotify</h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-black/65 sm:text-lg">
                  Discografía, canciones publicadas y acceso directo al perfil de artista.
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
              {trackIds.map((id) => (
                <div
                  key={id}
                  className="overflow-hidden border border-white/10 bg-[#181818] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.28)] transition-transform duration-300 hover:-translate-y-1"
                >
                  <iframe
                    className="block w-full"
                    style={{ borderRadius: '8px' }}
                    src={`https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0`}
                    height="352"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    title={`Spotify track ${id}`}
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
