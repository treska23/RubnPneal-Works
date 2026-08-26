import Head from 'next/head';
import SectionLayout from '@components/SectionLayout';

interface PlaylistItemsApiResponse { items?: { snippet: { title?: string; resourceId: { videoId: string } } }[]; nextPageToken?: string; }
type VideoItem = { id: string; title: string };
interface VideosPageProps { videos: VideoItem[]; }

export default function VideosPage({ videos }: VideosPageProps) {
  return (
    <><Head><title>Audiovisual — RubnPneal</title><meta name="description" content="Selección de trabajos audiovisuales de RubnPneal." /></Head><div className="bg-[#111] text-white"><SectionLayout eyebrow="Edición · Vídeo · Imagen" title="Audiovisual" className="min-h-[70svh]"><div className="mb-12 grid gap-8 border-t border-white/15 pt-7 lg:grid-cols-[1.2fr_0.8fr]"><p className="max-w-4xl text-3xl font-medium leading-tight tracking-[-0.03em] sm:text-4xl lg:text-5xl">Piezas audiovisuales presentadas como trabajo, no como interfaz de juego.</p><p className="max-w-xl text-base leading-7 text-white/55">Aquí se mantiene el contenido publicado en el canal, con una galería limpia y responsive que deja que cada vídeo hable por sí mismo.</p></div>{videos.length === 0 ? <div className="border-y border-white/15 py-16 text-white/45">No se pudieron cargar los vídeos en este momento.</div> : <div className="grid gap-x-6 gap-y-12 md:grid-cols-2 xl:grid-cols-3">{videos.map((video, index) => <article key={video.id}><div className="aspect-video overflow-hidden bg-black"><iframe className="h-full w-full" src={`https://www.youtube.com/embed/${video.id}?rel=0`} title={video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" /></div><div className="mt-4 flex gap-4 border-t border-white/15 pt-4"><span className="font-mono text-[11px] text-white/35">{String(index + 1).padStart(2, '0')}</span><h2 className="text-base font-medium leading-snug text-white/85">{video.title}</h2></div></article>)}</div>}</SectionLayout></div></>
  );
}

export async function getStaticProps() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) { console.warn('Missing YouTube API credentials'); return { props: { videos: [] }, revalidate: 3600 }; }
  try {
    const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`);
    if (!channelResponse.ok) return { props: { videos: [] }, revalidate: 3600 };
    const channelData = (await channelResponse.json()) as { items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[] };
    const uploadsId = channelData.items?.[0]?.contentDetails.relatedPlaylists.uploads;
    if (!uploadsId) return { props: { videos: [] }, revalidate: 3600 };
    const videos: VideoItem[] = [];
    let nextPageToken: string | undefined;
    do {
      const params = new URLSearchParams({ part: 'snippet', playlistId: uploadsId, maxResults: '50', key: apiKey });
      if (nextPageToken) params.set('pageToken', nextPageToken);
      const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`);
      if (!response.ok) break;
      const data = (await response.json()) as PlaylistItemsApiResponse;
      for (const item of data.items ?? []) { const id = item.snippet.resourceId.videoId; if (id) videos.push({ id, title: item.snippet.title ?? 'Trabajo audiovisual' }); }
      nextPageToken = data.nextPageToken;
    } while (nextPageToken);
    return { props: { videos }, revalidate: 3600 };
  } catch (error) {
    console.error('YouTube API error:', error);
    return { props: { videos: [] }, revalidate: 3600 };
  }
}
