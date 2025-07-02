'use client';
import { useEffect } from 'react';

export default function PacmanOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="space-y-4 rounded-lg bg-gray-900 p-6 text-center text-white">
        <p className="text-xl font-semibold">Juego de Pac-Man próximamente…</p>
        <button
          className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-700"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
