// components/ui/game-arkanoid/Arkanoid.tsx
'use client';

import { useEffect, useRef } from 'react';

export interface ArkanoidProps {
  videoId?: string;
}

/**
 * Simple placeholder canvas for the Arkanoid game. In a real implementation
 * the game logic would render on this canvas.
 */
export default function Arkanoid({ videoId }: ArkanoidProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = '20px sans-serif';
      ctx.fillText(`Arkanoid ${videoId ?? ''}`, 10, 30);
    }
  }, [videoId]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
