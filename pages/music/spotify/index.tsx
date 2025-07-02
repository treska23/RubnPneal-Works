// pages/music/spotify/index.tsx
import SectionLayout from '@components/SectionLayout';
import { useState } from 'react';
import dynamic from 'next/dynamic';

const PacmanOverlay = dynamic(
  () => import('@components/ui/pacman/PacmanOverlay'),
  { ssr: false },
);

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

export default function SpotifyPage() {
  const [showGame, setShowGame] = useState(false);
  return (
    <>
      {/* Declaramos la keyframes dentro de un style jsx global */}+{' '}
      <style jsx global>{`
        @keyframes pixel-pulse {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(0);
          }
          50% {
            transform: translate(-50%, -50%) scale(60);
          }
        }
      `}</style>
      <SectionLayout
        title="Spotify"
        className="bg-[#1DB954] text-white font-mono tracking-wide [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]"
      >
        <div className="relative overflow-hidden">
          {/* Pelota 8-bit: cruz de 5 bloques + 8 pequeños en esquinas */}
          {/* ───── CORAZÓN 8-bit LATIENDO ───── */}
          <div
            className="absolute top-1/2 left-1/2 pointer-events-none"
            style={{
              width: '6rem', // 6 columnas × 1 rem
              height: '5rem', // 5 filas × 1 rem
              transform: 'translate(-50%,-50%)',
              animation: 'pixel-pulse 4s ease-in-out infinite',
              transformOrigin: 'center center',
            }}
          >
            {[
              /* fila, col */ // patrón (6×5):
              /* ■ ■ ⬚ ⬚ ■ ■ */
              [0, 1],
              [0, 2],
              [0, 3],
              [0, 4],
              /* ■ ■ ■ ■ ■ ■ */
              [1, 0],
              [1, 1],
              [1, 2],
              [1, 3],
              [1, 4],
              [1, 5],
              /* ■ ■ ■ ■ ■ ■ */
              [2, 0],
              [2, 1],
              [2, 2],
              [2, 3],
              [2, 4],
              [2, 5],
              /* ⬚ ■ ■ ■ ■ ⬚ */
              [3, 1],
              [3, 2],
              [3, 3],
              [3, 4],
              /* ⬚ ⬚ ■ ■ ⬚ ⬚ */
              [4, 2],
              [4, 3],
            ].map(([row, col], i) => (
              <div
                key={i}
                className="bg-white"
                style={{
                  position: 'absolute',
                  top: `${row}rem`,
                  left: `${col}rem`,
                  width: '1rem',
                  height: '1rem',
                }}
              />
            ))}
          </div>
          {/* Botón para iniciar Pac-Man */}
          <button
            className="mb-6 px-4 py-2 rounded bg-yellow-600 text-white hover:bg-yellow-700 font-semibold"
            onClick={() => setShowGame(true)}
          >
            🟡 Jugar Pac-Man
          </button>
          {/* Tu grid de iframes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
            {trackIds.map((id) => (
              <div
                key={id}
                className="relative overflow-hidden rounded-lg border-2 border-green-400 transform transition-all duration-300 hover:-rotate-1 hover:scale-105"
              >
                <iframe
                  style={{ borderRadius: '12px' }}
                  src={`https://open.spotify.com/embed/track/${id}?utm_source=generator`}
                  width="100%"
                  height="352"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
          {/* Embed del reproductor de artista */}
          <div className="mt-12 px-4">
            <iframe
              style={{ borderRadius: '12px' }}
              src="https://open.spotify.com/embed/artist/24cB9jl7geMfGyDiW29KlY?utm_source=generator"
              width="100%"
              height="352"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            ></iframe>{' '}
          </div>{' '}
        </div>
        </SectionLayout>
        {showGame && <PacmanOverlay onClose={() => setShowGame(false)} />}
      </>
    );
  }
