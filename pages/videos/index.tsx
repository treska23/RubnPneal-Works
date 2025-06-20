// pages/videos/index.tsx
import React from "react";
import Image from "next/image";
import SectionLayout from "@/components/SectionLayout";
import VideoGrid from "@/components/VideoGrid";

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
        <VideoGrid videos={videos} />
      </div>
    </SectionLayout>
  );
};

export default VideosPage;

// ─── 3) getStaticProps ──────────────────────────────────────────────────
export async function getStaticProps() {
  const apiKey = process.env.YOUTUBE_API_KEY!;
  const channelId = process.env.YOUTUBE_CHANNEL_ID!;

  // 1) Sacamos el playlist de “uploads”
  const chRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`,
  );
  const chJson = (await chRes.json()) as {
    items: { contentDetails: { relatedPlaylists: { uploads: string } } }[];
  };

  if (!Array.isArray(chJson.items) || chJson.items.length === 0) {
    console.warn("YouTube API fallo o canal vacío:", chJson);
    return { props: { videos: [] }, revalidate: 3600 };
  }

  const uploadsId = chJson.items[0].contentDetails.relatedPlaylists.uploads;

  // 2) Paginamos todas las llamadas para traer TODOS los vídeos
  const videos: string[] = [];
  let nextPageToken: string | undefined = undefined;

  do {
    const params = new URLSearchParams({
      part: "snippet",
      playlistId: uploadsId,
      maxResults: "50", // el máximo permitido
      key: apiKey,
    });
    if (nextPageToken) params.set("pageToken", nextPageToken);

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
