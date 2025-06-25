'use client';

import { useEffect, useRef, useState } from 'react';

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
  const [livesState, setLivesState] = useState(3);

  useEffect(() => {
    const baseSpeed = 4; // velocidad pensada para un canvas de referencia (800 px)
    let speedFactor = 1;
    const basePaddleSpeed = 8; // pensado para 800 px de ancho
    let paddleSpeed = basePaddleSpeed * speedFactor;
    let lives = 3;
    setLivesState(3);

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

    function resizeCanvas() {
      if (!canvasRef.current) return;
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;

      const maxDim = Math.max(window.innerWidth, window.innerHeight);
      speedFactor = maxDim / 800;
      paddleSpeed = basePaddleSpeed * speedFactor;
      createBlocks();
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const paddle = { x: canvasEl.width / 2 - 40, w: 80, h: 10 };
    let leftPressed = false;
    let rightPressed = false;

    const ball = {
      x: canvasRef.current!.width / 2,
      y: canvasRef.current!.height / 2,
      dx: baseSpeed * speedFactor,
      dy: -baseSpeed * speedFactor,
      r: 8,
    };

    let animationId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

      ctx.fillStyle = 'white';
      ctx.fillRect(paddle.x, canvasEl.height - 30, paddle.w, paddle.h);

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      blocks.forEach((b) => {
        if (!b.alive) return;
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(b.x, b.y, b.w, b.h);
      });

      const w = canvasRef.current!.width;
      const h = canvasRef.current!.height;

      if (rightPressed && paddle.x < w - paddle.w) paddle.x += paddleSpeed;
      if (leftPressed && paddle.x > 0) paddle.x -= paddleSpeed;
      paddle.x = Math.max(0, Math.min(w - paddle.w, paddle.x));

      ball.x += ball.dx;
      ball.y += ball.dy;

      if (ball.x < ball.r || ball.x > w - ball.r) ball.dx = -ball.dx;
      if (ball.y < ball.r || ball.y > h - ball.r) ball.dy = -ball.dy;

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
      const paddleY = h - 30;
      if (
        ball.dy > 0 &&
        ball.y + ball.r >= paddleY &&
        ball.x >= paddle.x &&
        ball.x <= paddle.x + paddle.w
      ) {
        ball.dy *= -1;
        ball.y = paddleY - ball.r;
      } else if (ball.y > h - ball.r) {
        lives -= 1;
        setLivesState(lives);
        if (lives === 0) {
          onClose();
          return;
        }
        ball.x = w / 2;
        ball.y = h / 2;
        const dir = Math.random() < 0.5 ? -1 : 1;
        ball.dx = dir * baseSpeed * speedFactor;
        ball.dy = -baseSpeed * speedFactor;
      }

      const dirX = Math.sign(ball.dx);
      const dirY = Math.sign(ball.dy);
      ball.dx = dirX * baseSpeed * speedFactor;
      ball.dy = dirY * baseSpeed * speedFactor;

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
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90">
      <div className="absolute top-4 left-4 text-white text-xl pointer-events-none">
        {Array(livesState).fill('♥').join('')}
      </div>
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
