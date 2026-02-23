'use client';

import { useEffect } from 'react';
import PacmanGame from './PacmanGame';

export default function PacmanOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-lg border border-yellow-400"
        onClick={(event) => event.stopPropagation()}
      >
        <PacmanGame />
        <button
          type="button"
          aria-label="Cerrar Pac-Man"
          className="absolute right-4 top-4 text-3xl text-white"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
