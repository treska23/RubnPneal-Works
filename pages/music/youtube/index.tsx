import Head from 'next/head';
import Link from 'next/link';
import Parser from 'rss-parser';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import SectionLayout from '@components/SectionLayout';

const CHANNEL_ID = 'UCAyA9gTo-GPaKNnlulvS8iw';
type YouTubeVideo = { id: string; title: string };

export async function getStaticProps() {
  try {
    const feed = await new Parser().parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`);
    const videos: YouTubeVideo[] = feed.items.map((item) => ({ id: item.link?.split('v=')[1]?.split('&')[0] ?? '', title: item.title ?? 'Vídeo musical' })).filter((video) => Boolean(video.id));
    return { props: { videos }, revalidate: 3600 };
  } catch (error) {
    console.error('Failed to fetch YouTube RSS feed:', error);
    return { props: { videos: [] }, revalidate: 3600 };
  }
}

export default function YouTubeMusicPage({ videos }: { videos: YouTubeVideo[] }) {
  return (
    <><Head><title>YouTube Music — RubnPneal</title><meta name="description" content="Publicaciones musicales de RubnPneal en YouTube." /></Head><div className="bg-[#f5f2e8]"><SectionLayout eyebrow="Música / YouTube" title="Vídeos musicales"><div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-t border-black/15 pt-6"><Link href="/music" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4" /> Música</Link><a href={`https://www.youtube.com/channel/${CHANNEL_ID}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border-b border-black pb-1 text-sm font-semibold">Abrir canal <ArrowUpRight className="h-4 w-4" /></a></div>{videos.length === 0 ? <div className="border-y border-black/15 py-16 text-black/55">No se pudieron cargar los vídeos en este momento.</div> : <div className="grid gap-x-6 gap-y-10 md:grid-cols-2">{videos.map((video) => <article key={video.id}><div className="aspect-video overflow-hidden bg-black"><iframe className="h-full w-full" src={`https://www.youtube.com/embed/${video.id}?rel=0`} title={video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" /></div><h2 className="mt-4 text-lg font-semibold leading-snug">{video.title}</h2></article>)}</div>}</SectionLayout></div></>
  );
}
