// pages/videos/index.tsx
import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import SectionLayout from '@/components/SectionLayout';

const Arkanoid = dynamic(
  () => import('@/components/ui/game-arkanoid/Arkanoid'),
  {
    ssr: false,
  },
);
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

function ArkanoidCard() {

  const [play, setPlay] = useState(false);
  return (
    <div className="rounded shadow relative group">
      {play ? (
        <Arkanoid isActive={play} />
      ) : (
        <canvas className="w-full h-48 object-cover" />
      )}
      {!play && (
        <button
          onClick={() => setPlay(true)}
          className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition"
        >
          ▶️ Jugar Arkanoid
        </button>
      )}
    </div>
  );
}

// ─── 2) COMPONENTE PRINCIPAL ─────────────────────────────────────────────
const VideosPage: React.FC<VideosPageProps> = ({ videos }) => {
  const router = useRouter();
  const videoId = router.query.videoId;

  return (
    <SectionLayout className="relative bg-gray-900 text-white">
      {/* — Fantasma animado como fondo — */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Image
          src="/images/ghost.png"
          alt="Fantasma retro"
          width={2160} // ajusta al tamaño que quieras
          height={2160}
          className="absolute bottom-8 animate-ghost"
          priority
        />
      </div>

      {/* — CONTENIDO EN PRIMER PLANO — */}
      <div className="relative z-10 px-4">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((id) => (
            <div
              key={id}
              className="relative aspect-video w-full overflow-hidden rounded-lg border border-neutral-700"
            >
              <YouTube
                videoId={id}
                className="absolute inset-0 w-full h-full"
                iframeClassName="w-full h-full"
                opts={{
                  width: '100%',
                  height: '100%',
                  playerVars: { playsinline: 1 },
                }}
              />
            </div>
          ))}
          <ArkanoidCard
            videoId={typeof videoId === 'string' ? videoId : undefined}
          />
        </div>
      </div>
    </SectionLayout>
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
