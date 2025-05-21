// pages/music/youtube/index.tsx
import SectionLayout from "@/components/SectionLayout";
import Parser from "rss-parser";

const CHANNEL_ID = "UCAyA9gTo-GPaKNnlulvS8iw";
const youtubeEmbeds = [
  "https://www.youtube.com/embed/RXNj-MnTLFA",
  "https://www.youtube.com/embed/T_3qrzcDkAU",
  "https://www.youtube.com/embed/0n72YppaTg8",
  "https://www.youtube.com/embed/HeMutzB-rYc",
  "https://www.youtube.com/embed/uAv_fvXs_DE",
  "https://www.youtube.com/embed/22dx8LN8o1A",
  "https://www.youtube.com/embed/SxD3kFOdK8Y",
  "https://www.youtube.com/embed/tuNVwzS4KY4",
  "https://www.youtube.com/embed/fNk6zBTDZvU",
  "https://www.youtube.com/embed/W9Xj8VWbZSc",
  "https://www.youtube.com/embed/8IP4PmwJOYg",
  "https://www.youtube.com/embed/p9deLBAxpt8",
];

type YouTubeVideo = { id: string; title: string; thumbnail: string };

export async function getStaticProps() {
  const feed = await new Parser().parseURL(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`
  );
  const videos: YouTubeVideo[] = feed.items.map((i) => ({
    id: i.link?.split("v=")[1] ?? "",
    title: i.title ?? "",
    thumbnail: i["media:thumbnail"]?.url ?? "",
  }));
  return { props: { videos } };
}

export default function YouTubePage() {
  return (
    <>
      <style jsx global>{`
        /* desplazamiento diagonal */
        @keyframes tv-scan-diag {
          from {
            background-position: 0 0;
          }
          to {
            background-position: 120px 120px; /* debe ser múltiplo del pattern */
          }
        }
        /* parpadeo CRT */
        @keyframes flicker {
          0%,
          100% {
            opacity: 1; /* blanco encendido */
          }
          50% {
            opacity: 0; /* se apaga → rojo puro detrás */
          }
        }
      `}</style>

      <SectionLayout
        title="YouTube"
        className="relative bg-red-600 text-white font-black uppercase tracking-widest [text-shadow:2px_2px_0_rgba(0,0,0,0.8)]"
      >
        {/* ─── Overlay de líneas diagonales CRT ─── */}
        <div
          className="pointer-events-none absolute inset-0" // ← quitamos mix-blend-screen
          style={{
            /* 60 px blanco / 60 px hueco – ángulo 105 ° (ajústalo tú) */
            backgroundImage:
              "repeating-linear-gradient(350deg, #ffffff 0 100px, transparent 10px 320px)",
            animation:
              "tv-scan-diag 8s linear infinite, flicker 3s steps(100) infinite", // ← opacidad 1 ↔ 0
            imageRendering: "pixelated",
          }}
        />

        {/* ─── Grid de vídeos ─── */}
        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
          {youtubeEmbeds.map((src, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-lg border-2 border-black transform transition-all duration-300 hover:-rotate-1 hover:scale-105"
            >
              <iframe
                style={{ borderRadius: "12px" }}
                src={src}
                width="100%"
                height="240"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-4xl">▶️</span>
              </div>
            </div>
          ))}
        </div>
      </SectionLayout>
    </>
  );
}
