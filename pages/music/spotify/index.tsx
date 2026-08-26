import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import SectionLayout from '@components/SectionLayout';

const trackIds = ['5Q3jx7MeOdXMORcYRVrZCr','2ZR3fNmXvvCEM7c1NBQc8I','29SF1Np1YcHL2do0yn2WP9','6aeQRm0Hmimiq8H2eX57PN','0ilhM3zao9dvKNKxcvoAD9','39M28XOz5rULAbErpccwZk','2Xypqm0teQLY1ECaS2UWIL','62FmlTMhpE1G1fGcDMAdOf','4GIkmAY5pQrEGavCtxe5e3'];
const ARTIST_ID = '24cB9jl7geMfGyDiW29KlY';

export default function SpotifyPage() {
  return (
    <><Head><title>Spotify — RubnPneal</title><meta name="description" content="Canciones de RubnPneal en Spotify." /></Head><div className="bg-[#f5f2e8]"><SectionLayout eyebrow="Música / Spotify" title="Discografía"><div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-t border-black/15 pt-6"><Link href="/music" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4" /> Música</Link><a href={`https://open.spotify.com/artist/${ARTIST_ID}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border-b border-black pb-1 text-sm font-semibold">Abrir perfil en Spotify <ArrowUpRight className="h-4 w-4" /></a></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{trackIds.map((id) => <div key={id} className="overflow-hidden border border-black/10 bg-white/55 p-2"><iframe className="block w-full" style={{ borderRadius: '8px' }} src={`https://open.spotify.com/embed/track/${id}?utm_source=generator`} height="352" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title={`Spotify track ${id}`} /></div>)}</div><div className="mt-14 border-t border-black/15 pt-10"><p className="eyebrow mb-5">Perfil de artista</p><iframe className="block w-full" style={{ borderRadius: '8px' }} src={`https://open.spotify.com/embed/artist/${ARTIST_ID}?utm_source=generator`} height="352" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Perfil de artista de RubnPneal en Spotify" /></div></SectionLayout></div></>
  );
}
