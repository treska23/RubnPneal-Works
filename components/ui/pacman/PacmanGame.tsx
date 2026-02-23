'use client';

import { useEffect, useRef, useState } from 'react';

type Pellet = {
  x: number;
  y: number;
  eaten: boolean;
};

const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 640;
const PACMAN_RADIUS = 14;
const PACMAN_SPEED = 220;
const PELLET_RADIUS = 4;

export default function PacmanGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pressedKeysRef = useRef<Set<string>>(new Set());

  const pacmanRef = useRef({
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    direction: 0,
    mouthTimer: 0,
  });

  const pelletsRef = useRef<Pellet[]>(
    Array.from({ length: 90 }, (_, i) => {
      const col = i % 15;
      const row = Math.floor(i / 15);

      return {
        x: 70 + col * 58,
        y: 80 + row * 85,
        eaten: false,
      };
    }),
  );

  const [score, setScore] = useState(0);
  const [lives] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const resize = () => {
      const pixelRatio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      pressedKeysRef.current.add(event.key);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeysRef.current.delete(event.key);
    };

    const movePacman = (deltaSeconds: number) => {
      const keys = pressedKeysRef.current;
      const pacman = pacmanRef.current;
      let velocityX = 0;
      let velocityY = 0;

      if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) {
        velocityY -= 1;
        pacman.direction = -Math.PI / 2;
      }
      if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) {
        velocityY += 1;
        pacman.direction = Math.PI / 2;
      }
      if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) {
        velocityX -= 1;
        pacman.direction = Math.PI;
      }
      if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) {
        velocityX += 1;
        pacman.direction = 0;
      }

      const distance = Math.hypot(velocityX, velocityY);
      if (distance > 0) {
        velocityX /= distance;
        velocityY /= distance;
      }

      pacman.x += velocityX * PACMAN_SPEED * deltaSeconds;
      pacman.y += velocityY * PACMAN_SPEED * deltaSeconds;

      pacman.x = Math.min(
        WORLD_WIDTH - PACMAN_RADIUS,
        Math.max(PACMAN_RADIUS, pacman.x),
      );
      pacman.y = Math.min(
        WORLD_HEIGHT - PACMAN_RADIUS,
        Math.max(PACMAN_RADIUS, pacman.y),
      );
      pacman.mouthTimer += deltaSeconds * 12;
    };

    const draw = () => {
      const viewportWidth = canvas.clientWidth;
      const viewportHeight = canvas.clientHeight;
      const scale = Math.min(
        viewportWidth / WORLD_WIDTH,
        viewportHeight / WORLD_HEIGHT,
      );
      const offsetX = (viewportWidth - WORLD_WIDTH * scale) / 2;
      const offsetY = (viewportHeight - WORLD_HEIGHT * scale) / 2;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      ctx.strokeStyle = '#1e40af';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, WORLD_WIDTH - 6, WORLD_HEIGHT - 6);

      let pointsGained = 0;
      const pacman = pacmanRef.current;

      for (const pellet of pelletsRef.current) {
        if (pellet.eaten) {
          continue;
        }

        const dist = Math.hypot(pacman.x - pellet.x, pacman.y - pellet.y);
        if (dist <= PACMAN_RADIUS + PELLET_RADIUS) {
          pellet.eaten = true;
          pointsGained += 10;
          continue;
        }

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(pellet.x, pellet.y, PELLET_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      if (pointsGained > 0) {
        setScore((prev) => prev + pointsGained);
      }

      const mouthOpen = 0.2 + Math.abs(Math.sin(pacman.mouthTimer)) * 0.35;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(pacman.x, pacman.y);
      ctx.arc(
        pacman.x,
        pacman.y,
        PACMAN_RADIUS,
        pacman.direction + mouthOpen,
        pacman.direction + Math.PI * 2 - mouthOpen,
      );
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(
        pacman.x + Math.cos(pacman.direction - 0.5) * 6,
        pacman.y + Math.sin(pacman.direction - 0.5) * 6,
        2.4,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      ctx.restore();
    };

    let lastTime = performance.now();

    const gameLoop = (now: number) => {
      const deltaSeconds = Math.min(0.04, (now - lastTime) / 1000);
      lastTime = now;

      movePacman(deltaSeconds);
      draw();

      animationFrameRef.current = window.requestAnimationFrame(gameLoop);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    animationFrameRef.current = window.requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md bg-black/60 px-3 py-2 font-mono text-sm text-white">
        <p>Vidas: {lives}</p>
        <p>Puntuación: {score}</p>
        <p className="text-yellow-300">Mover: ⬅️⬆️➡️⬇️ / WASD</p>
      </div>
      <canvas ref={canvasRef} className="h-full w-full bg-black" />
    </div>
  );
}
