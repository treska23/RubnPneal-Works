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
    const canvasNode = canvasRef.current;
    if (!canvasNode) return;
    const canvasEl = canvasNode as HTMLCanvasElement;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    const blocks: Block[] = [];
    function createBlocks() {
      blocks.length = 0;
      const bw = Math.min(80, canvasEl.width / 10);
      const bh = 20;
      const count = Math.floor(canvasEl.width / bw) * 2;
      for (let i = 0; i < count; i++) {
        const x = Math.random() * (canvasEl.width - bw);
        const y = 60 + Math.random() * (canvasEl.height * 0.3 - bh);
        blocks.push({ x, y, w: bw, h: bh, alive: true });
      }
    }

    const resize = () => {
      canvasEl.width = window.innerWidth;
      canvasEl.height = window.innerHeight;
      createBlocks();
    };
    resize();
    window.addEventListener('resize', resize);

    let paddleX = canvasEl.width / 2 - 40;
    const paddleWidth = 80;
    const paddleHeight = 10;
    let leftPressed = false;
    let rightPressed = false;

    const ball = {
      x: canvasEl.width / 2,
      y: canvasEl.height / 2,
      r: 6,
      dx: 2,
      dy: -2,
    };

    let animationId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

      ctx.fillStyle = 'white';
      ctx.fillRect(paddleX, canvasEl.height - 30, paddleWidth, paddleHeight);

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
      paddleX = Math.max(0, Math.min(canvasEl.width - paddleWidth, paddleX));

      ball.x += ball.dx;
      ball.y += ball.dy;
      if (ball.x < ball.r || ball.x > canvasEl.width - ball.r) ball.dx *= -1;
      if (ball.y < ball.r) ball.dy *= -1;

      for (const b of blocks) {
        if (!b.alive) continue;
        if (
          ball.x + ball.r > b.x &&
          ball.x - ball.r < b.x + b.w &&
          ball.y + ball.r > b.y &&
          ball.y - ball.r < b.y + b.h
        ) {
          b.alive = false;
          ball.dy *= -1;
          break;
        }
      }
      const paddleY = canvasEl.height - 30;
      if (
        ball.dy > 0 &&
        ball.y + ball.r >= paddleY &&
        ball.x >= paddleX &&
        ball.x <= paddleX + paddleWidth
      ) {
        ball.dy *= -1;
        ball.y = paddleY - ball.r;
      } else if (ball.y > canvasEl.height - ball.r) {
        ball.dy *= -1;
      }

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
