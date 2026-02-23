'use client';
import { useEffect } from 'react';
import PacmanGame from './PacmanGame';

export default function PacmanOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90">
      <PacmanGame />
      <button
        className="absolute top-4 right-4 text-white text-3xl"
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  );
}
