// components/ui/game-arkanoid/Arkanoid.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

export interface ArkanoidProps {
  /** Whether the game should run */
  isActive: boolean;
}

/**
 * Minimal Arkanoid canvas prepared for future logic.
 * When `isActive` is false a simple placeholder is rendered.
 */
export default function Arkanoid({ isActive }: ArkanoidProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);
  // Reference the state to avoid the no-unused-vars lint error until
  // paddle movement logic is implemented.
  void leftPressed;
  void rightPressed;

  useEffect(() => {
    if (!isActive) return;


    const canvas = canvasRef.current;
    if (!canvas) return;

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
  }, [isActive]);

  if (!isActive) {
    return <div className="w-full h-full bg-gray-800" />;
  }

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
