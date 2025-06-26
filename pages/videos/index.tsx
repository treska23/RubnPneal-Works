// pages/videos/index.tsx
import React, { useRef, useState, useCallback } from 'react';
import type YouTubePlayer from 'react-youtube';
import Image from 'next/image';

const thumbUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
import dynamic from 'next/dynamic';
import SectionLayout from '@/components/SectionLayout';
import ArkanoidOverlay from '@/components/ui/game-arkanoid/ArkanoidOverlay';
const YouTube = dynamic(() => import('react-youtube'), { ssr: false });

interface PlaylistItemsApiResponse {
  items: {
    snippet: {
      resourceId: { videoId: string };
    };
  }[];
  nextPageToken?: string;
}

interface VideosPageProps {
  videos: string[];
}

// ─── 2) COMPONENTE PRINCIPAL ─────────────────────────────────────────────
const VideosPage: React.FC<VideosPageProps> = ({ videos }) => {
  const [showGame, setShowGame] = useState(false);
  const videoRectsRef = useRef<DOMRect[]>([]);
  const playersRef = useRef<Record<string, YouTubePlayer | null>>({});
  const currentPlaying = useRef<string | null>(null);

  const handleVideoHit = useCallback((id: string) => {
    const player = playersRef.current[id];
    if (!player) return;

    if (currentPlaying.current && currentPlaying.current !== id) {
      const old = playersRef.current[currentPlaying.current];
      old?.pauseVideo();
    }

    const state = player.getPlayerState();
    if (state === 1) {
      player.pauseVideo();
      currentPlaying.current = null;
    } else {
      player.playVideo();
      currentPlaying.current = id;
    }
  }, []);

  return (
    <>
      <SectionLayout
        className={`relative bg-gray-900 text-white transition-all ${showGame ? 'xl:max-w-[75vw] mx-auto' : ''}`}
      >
        {/* — Fantasma animado como fondo — */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Image
            src="/images/Ghost.png"
            alt="Fantasma retro"
            width={2160}
            height={2160}
            className="absolute bottom-8 animate-ghost w-full h-full object-cover"
            priority
          />
        </div>

        {/* — CONTENIDO EN PRIMER PLANO — */}
        <div className="relative z-10 px-4">
          <button
            className="mb-6 px-4 py-2 rounded bg-pink-600 text-white hover:bg-pink-700 font-semibold transition"
            onClick={() => setShowGame(true)}
          >
            🚀 Jugar Arkanoid
          </button>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((v, i) => {
              if (!v) return null;
              return (
                <div
                  key={v}
                  data-video-id={v}
                  ref={(el) => {
                    if (el)
                      videoRectsRef.current[i] = el.getBoundingClientRect();
                  }}
                  className="relative aspect-video w-full overflow-hidden rounded-lg border border-neutral-700"
                >
                  <Image
                    src={thumbUrl(v)}
                    alt="thumbnail"
                    fill
                    sizes="(max-width:600px) 100vw, 25vw"
                    className="object-cover rounded-lg"
                    priority
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.src = '/images/thumb-placeholder.svg';
                    }}
                  />
                  <YouTube
                    videoId={v}
                    onReady={(e) => {
                      playersRef.current[v] = e.target;
                      e.target.mute();
                    }}
                    className="absolute inset-0 w-full h-full"
                    iframeClassName="w-full h-full"
                    opts={{
                      width: '100%',
                      height: '100%',
                      playerVars: { playsinline: 1 },
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </SectionLayout>
      {showGame && (
        <ArkanoidOverlay
          videoIds={videos}
          onVideoHit={handleVideoHit}
          onClose={() => setShowGame(false)}
        />
      )}
    </>
  );
};

export default VideosPage;

// ─── 3) getStaticProps ──────────────────────────────────────────────────
export async function getStaticProps() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;

  if (!apiKey || !channelId) {
    console.warn('Missing YouTube API credentials');
    return { props: { videos: [] } };
  }

  // 1) Sacamos el playlist de “uploads”
  const chRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`,
  );
  const chJson = (await chRes.json()) as {
    items: { contentDetails: { relatedPlaylists: { uploads: string } } }[];
  };

  if (!Array.isArray(chJson.items) || chJson.items.length === 0) {
    console.warn('YouTube API fallo o canal vacío:', chJson);
    return { props: { videos: [] }, revalidate: 3600 };
  }

  const uploadsId = chJson.items[0].contentDetails.relatedPlaylists.uploads;

  // 2) Paginamos todas las llamadas para traer TODOS los vídeos
  const videos: string[] = [];
  let nextPageToken: string | undefined = undefined;

  do {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId: uploadsId,
      maxResults: '50', // el máximo permitido
      key: apiKey,
    });
    if (nextPageToken) params.set('pageToken', nextPageToken);

    const url = `https://www.googleapis.com/youtube/v3/playlistItems?${params}`;
    const res = await fetch(url);
    const data = (await res.json()) as PlaylistItemsApiResponse;

    // Acumula los IDs de vídeo
    videos.push(...data.items.map((it) => it.snippet.resourceId.videoId));

    // Prepara la siguiente página (o rompe el bucle si es undefined)
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return {
    props: { videos },
    revalidate: 3600,
  };
}
