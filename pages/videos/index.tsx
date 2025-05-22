// pages/videos/index.tsx
import React from "react";
import Image from "next/image";
import SectionLayout from "@/components/SectionLayout";
import VideoFrame from "@/components/VideoFrame";

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
    <SectionLayout className="relative bg-gray-900 text-white overflow-hidden">
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
      <div className="relative z-10">
        {/* Cabecera con iconos y título */}
        <div className="flex items-center justify-center space-x-6 mb-8">
          <Image src="/images/vhs.svg" alt="Cinta VHS" width={64} height={64} />
          <h1 className="text-5xl font-bold">Vídeos</h1>
          <Image
            src="/images/beta.svg"
            alt="Cinta Betamax"
            width={64}
            height={64}
          />
        </div>

        {/* Grid de vídeos */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 px-4">
          {videos.map((id) => (
            <VideoFrame key={id} videoId={id} />
          ))}
        </div>
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
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
  );
  const chJson = (await chRes.json()) as {
    items: { contentDetails: { relatedPlaylists: { uploads: string } } }[];
  };
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
