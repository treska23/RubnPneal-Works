// components/ui/game-arkanoid/Arkanoid.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Minimal Arkanoid canvas prepared for future logic.
 */
export default function Arkanoid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);
  // Reference the state to avoid the no-unused-vars lint error until
  // paddle movement logic is implemented.
  void leftPressed;
  void rightPressed;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!containerRef.current) return;
    const { scrollWidth: w, scrollHeight: h } = containerRef.current;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      requestAnimationFrame(draw);
    };

    draw();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') setLeftPressed(true);
      if (e.code === 'ArrowRight') setRightPressed(true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') setLeftPressed(false);
      if (e.code === 'ArrowRight') setRightPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
