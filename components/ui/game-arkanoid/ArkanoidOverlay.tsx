'use client';

import { useEffect, useRef } from 'react';

interface Props {
  onClose: () => void;
}

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
}

export default function ArkanoidOverlay({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let paddleX = canvas.width / 2 - 40;
    const paddleWidth = 80;
    const paddleHeight = 10;
    let leftPressed = false;
    let rightPressed = false;

    const ball = { x: canvas.width / 2, y: canvas.height / 2, r: 6, dx: 2, dy: -2 };

    const blocks: Block[] = [];
    const cols = 8;
    const rows = 4;
    const bw = 60;
    const bh = 20;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const x = 60 + c * (bw + 10);
        const y = 60 + r * (bh + 10);
        blocks.push({ x, y, w: bw, h: bh, alive: true });
      }
    }

    let animationId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'white';
      ctx.fillRect(paddleX, canvas.height - 30, paddleWidth, paddleHeight);

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      blocks.forEach((b) => {
        if (!b.alive) return;
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(b.x, b.y, b.w, b.h);
      });

      if (leftPressed) paddleX -= 5;
      if (rightPressed) paddleX += 5;
      paddleX = Math.max(0, Math.min(canvas.width - paddleWidth, paddleX));

      ball.x += ball.dx;
      ball.y += ball.dy;
      if (ball.x < ball.r || ball.x > canvas.width - ball.r) ball.dx *= -1;
      if (ball.y < ball.r || ball.y > canvas.height - ball.r) ball.dy *= -1;

      animationId = requestAnimationFrame(draw);
    };
    draw();

    const keyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') leftPressed = true;
      if (e.code === 'ArrowRight') rightPressed = true;
    };
    const keyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') leftPressed = false;
      if (e.code === 'ArrowRight') rightPressed = false;
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90">
      <canvas ref={canvasRef} className="w-full h-full" />
      <button
        className="absolute top-4 right-4 text-white text-3xl pointer-events-auto"
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  );
}
