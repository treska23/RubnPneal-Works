'use client';

import { useEffect, useRef, useState } from 'react';

export default function PacmanGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score] = useState(0);
  const [lives] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-2 left-2 space-x-4 text-white">
        <span>Vidas: {lives}</span>
        <span>Puntuación: {score}</span>
      </div>
      <canvas ref={canvasRef} className="w-full h-full bg-black" />
    </div>
  );
}
