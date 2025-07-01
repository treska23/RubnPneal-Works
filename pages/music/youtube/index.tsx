// pages/music/youtube/index.tsx
import SectionLayout from '@components/SectionLayout';
import Parser from 'rss-parser';
import { useState } from 'react';
import dynamic from 'next/dynamic';

const MusicGalaxianOverlay = dynamic(
  () => import('@components/ui/music-galaxian/MusicGalaxianOverlay'),
  { ssr: false },
);

const CHANNEL_ID = 'UCAyA9gTo-GPaKNnlulvS8iw';

type YouTubeVideo = { id: string; title: string; thumbnail: string };

export async function getStaticProps() {
  try {
    const feed = await new Parser().parseURL(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
    );
    const videos: YouTubeVideo[] = feed.items.map((i) => ({
      id: i.link?.split('v=')[1] ?? '',
      title: i.title ?? '',
      thumbnail: i['media:thumbnail']?.url ?? '',
    }));
    return { props: { videos } };
  } catch (err) {
    console.error('Failed to fetch YouTube RSS feed:', err);
    return { props: { videos: [] } };
  }
}

export default function YouTubePage({ videos }: { videos: YouTubeVideo[] }) {
  const [showGame, setShowGame] = useState(false);
  const ids = videos.map((v) => v.id);
  return (
    <>
      <style jsx global>{`
        @keyframes tv-scan-diag {
          from {
            background-position: 0 0;
          }
          to {
            background-position: 120px 120px;
          }
        }
        @keyframes flicker {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
      `}</style>

      <SectionLayout
        title="YouTube"
        className="relative bg-red-600 text-white font-black uppercase tracking-widest [text-shadow:2px_2px_0_rgba(0,0,0,0.8)]"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(350deg, #ffffff 0 100px, transparent 10px 320px)',
            animation:
              'tv-scan-diag 8s linear infinite, flicker 3s steps(100) infinite',
            imageRendering: 'pixelated',
          }}
        />

        <button
          className="mb-6 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 font-semibold"
          onClick={() => setShowGame(true)}
        >
          🎮 Jugar Galaxian
        </button>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
          {videos.length === 0 ? (
            <p className="col-span-full text-center py-8">
              No se pudieron cargar los videos.
            </p>
          ) : (
            videos.map((video, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-lg border-2 border-black transform transition-all duration-300 hover:-rotate-1 hover:scale-105"
              >
                <iframe
                  className="yt-thumb"
                  style={{ borderRadius: '12px' }}
                  src={`https://www.youtube.com/embed/${video.id}?enablejsapi=1&rel=0`}
                  width="100%"
                  height="240"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                  <span className="text-4xl">▶️</span>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionLayout>
      {showGame && (
        <MusicGalaxianOverlay
          videoIds={ids}
          onClose={() => setShowGame(false)}
        />
      )}
    </>
  );
}
