'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useRef, useState } from 'react';
import { safeQuery } from '@/lib/utils';

interface Props {
  videoIds: string[];
  onVideoHit: (id: string) => void;
  onClose: () => void;
}

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
  isTrigger?: boolean;
  videoId?: string;
  cooldown?: number;
}

function bricksForRect(
  rect: DOMRect,
  canvasW: number,
  canvasH: number,
): Brick[] {
  const brickW = 60;
  const brickH = 20;
  const padding = 4;
  const bricks: Brick[] = [];
  const safeX = canvasW / 2;
  const safeY = canvasH * 0.3;

  for (let x = rect.left; x <= rect.right - brickW; x += brickW + padding) {
    const top = {
      x,
      y: rect.top - brickH - padding,
      w: brickW,
      h: brickH,
      alive: true,
    };
    const bottom = {
      x,
      y: rect.bottom + padding,
      w: brickW,
      h: brickH,
      alive: true,
    };
    const cxT = top.x + brickW / 2;
    const cyT = top.y + brickH / 2;
    const cxB = bottom.x + brickW / 2;
    const cyB = bottom.y + brickH / 2;
    if (Math.hypot(cxT - safeX, cyT - safeY) > 120) bricks.push(top);
    if (Math.hypot(cxB - safeX, cyB - safeY) > 120) bricks.push(bottom);
  }
  for (let y = rect.top; y <= rect.bottom - brickH; y += brickH + padding) {
    const left = {
      x: rect.left - brickW - padding,
      y,
      w: brickW,
      h: brickH,
      alive: true,
    };
    const right = {
      x: rect.right + padding,
      y,
      w: brickW,
      h: brickH,
      alive: true,
    };
    const cxL = left.x + brickW / 2;
    const cyL = left.y + brickH / 2;
    const cxR = right.x + brickW / 2;
    const cyR = right.y + brickH / 2;
    if (Math.hypot(cxL - safeX, cyL - safeY) > 120) bricks.push(left);
    if (Math.hypot(cxR - safeX, cyR - safeY) > 120) bricks.push(right);
  }
  return bricks;
}

function hitAABB(b: { x: number; y: number; r: number }, t: Brick) {
  return (
    b.x + b.r > t.x &&
    b.x - b.r < t.x + t.w &&
    b.y + b.r > t.y &&
    b.y - b.r < t.y + t.h
  );
}

export default function ArkanoidOverlay({
  videoIds,
  onVideoHit,
  onClose,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [livesState, setLivesState] = useState(3);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const baseSpeed = 4;
    let speedFactor = 1;
    const basePaddleSpeed = 8;
    let paddleSpeed = basePaddleSpeed * speedFactor;
    let lives = 3;
    setLivesState(3);

    const canvasNode = canvasRef.current;
    if (!canvasNode) return;
    const canvasEl = canvasNode as HTMLCanvasElement;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    let bricks: Brick[] = [];
    let victory = false;

    interface Particle {
      x: number;
      y: number;
      dx: number;
      dy: number;
      life: number;
      color: string;
    }
    let particles: Particle[] = [];

    function startFireworks() {
      const colors = ['#ff5959', '#59ff59', '#5995ff', '#ffff59', '#ffffff'];
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        particles.push({
          x: canvasEl.width / 2,
          y: canvasEl.height / 2,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed,
          life: 60 + Math.random() * 30,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    }
    const domElems = videoIds.map((id) =>
      safeQuery<HTMLElement>(document, `[data-video-id="${id}"]`),
    );

    function createBricks() {
      bricks.length = 0;
      const canvasRect = canvasEl.getBoundingClientRect();
      domElems.forEach((el, idx) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const rect = {
          left: r.left - canvasRect.left,
          top: r.top - canvasRect.top,
          right: r.right - canvasRect.left,
          bottom: r.bottom - canvasRect.top,
          width: r.width,
          height: r.height,
        } as DOMRect;
        const around = bricksForRect(rect, canvasEl.width, canvasEl.height);
        bricks.push(...around);
        const trigger = {
          x: rect.left + rect.width / 2 - 30,
          y: rect.top + rect.height / 2 - 10,
          w: 60,
          h: 20,
          alive: true,
          isTrigger: true,
          videoId: videoIds[idx],
          cooldown: 0,
        } as Brick;
        bricks.push(trigger);
      });
    }

    let ballAttached = true;

    const paddle = { x: 0, w: 80, h: 10 };
    const keyState = { left: false, right: false, space: false };

    const ball = {
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
      r: 8,
    };

    function stickBallToPaddle() {
      ball.x = paddle.x + paddle.w / 2;
      ball.y = canvasEl.height - 30 - ball.r - 2;
    }

    function launchBall() {
      const dirX = Math.random() < 0.5 ? -1 : 1;
      ball.dx = dirX * baseSpeed * speedFactor || dirX * 2;
      ball.dy = -baseSpeed * speedFactor || -2;
      ballAttached = false;
    }

    function resizeCanvas() {
      if (!canvasRef.current) return;
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;

      const maxDim = Math.max(window.innerWidth, window.innerHeight);
      speedFactor = maxDim / 800;
      paddleSpeed = basePaddleSpeed * speedFactor || 6;
      paddle.x = canvasEl.width / 2 - paddle.w / 2;
      createBricks();
      ballAttached = true;
      ball.dx = ball.dy = 0;
      stickBallToPaddle();
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let animationId: number;

    const draw = () => {
      const canvasRect = canvasEl.getBoundingClientRect();
      domElems.forEach((el, idx) => {
        const trigger = bricks.find(
          (b) => b.isTrigger && b.videoId === videoIds[idx],
        );
        if (!el || !trigger) return;
        const r = el.getBoundingClientRect();
        trigger.x = r.left + r.width / 2 - 30 - canvasRect.left;
        trigger.y = r.top + r.height / 2 - 10 - canvasRect.top;
      });
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

      ctx.fillStyle = 'white';
      ctx.fillRect(paddle.x, canvasEl.height - 30, paddle.w, paddle.h);

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      bricks.forEach((b) => {
        if (!b.alive) return;
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(b.x, b.y, b.w, b.h);
      });

      if (victory) {
        ctx.fillStyle = '#0008';
        ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
        particles.forEach((p) => {
          p.x += p.dx;
          p.y += p.dy;
          p.life -= 1;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 2, p.y, 4, 4);
          ctx.fillRect(p.x + 2, p.y, 4, 4);
          ctx.fillRect(p.x, p.y - 2, 4, 4);
          ctx.fillRect(p.x, p.y + 2, 4, 4);
        });
        particles = particles.filter((p) => p.life > 0);
        ctx.fillStyle = 'white';
        ctx.font = '64px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          '🎉  Congratulation  🎉',
          canvasEl.width / 2,
          canvasEl.height / 2,
        );
        animationId = requestAnimationFrame(draw);
        return;
      }

      const w = canvasRef.current!.width;
      const h = canvasRef.current!.height;

      if (keyState.right && paddle.x < w - paddle.w) paddle.x += paddleSpeed;
      if (keyState.left && paddle.x > 0) paddle.x -= paddleSpeed;
      paddle.x = Math.max(0, Math.min(w - paddle.w, paddle.x));

      if (ballAttached) {
        stickBallToPaddle();
        if (keyState.space) launchBall();
      } else {
        ball.x += ball.dx;
        ball.y += ball.dy;
      }

      if (ball.x < ball.r || ball.x > w - ball.r) ball.dx = -ball.dx;
      if (ball.y < ball.r || ball.y > h - ball.r) ball.dy = -ball.dy;

      const bricksToDelete: Brick[] = [];
      bricks.forEach((b) => {
        if (!hitAABB(ball, b)) return;

        if (ball.dy > 0) ball.y = b.y - ball.r - 0.1;
        else ball.y = b.y + b.h + ball.r + 0.1;
        ball.dy = -ball.dy;

        if (b.isTrigger) {
          if (b.cooldown === 0) {
            b.cooldown = 30;
            setTimeout(() => onVideoHit(b.videoId!), 0);
          }
        } else {
          bricksToDelete.push(b);
        }
      });
      bricks = bricks.filter((b) => !bricksToDelete.includes(b));
      if (
        bricks.every((bk) => bk.isTrigger) &&
        bricksToDelete.length > 0 &&
        !victory
      ) {
        victory = true;
        startFireworks();
        setTimeout(onClose, 4000);
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
        ballAttached = true;
        ball.dx = ball.dy = 0;
        stickBallToPaddle();
      }

      const dirX = Math.sign(ball.dx);
      const dirY = Math.sign(ball.dy);
      ball.dx = dirX * baseSpeed * speedFactor;
      ball.dy = dirY * baseSpeed * speedFactor;

      bricks.forEach((b) => {
        if (b.cooldown && b.cooldown > 0) b.cooldown--;
      });

      animationId = requestAnimationFrame(draw);
    };
    draw();

    function onKey(e: KeyboardEvent, pressed: boolean) {
      if (e.code === 'ArrowLeft') keyState.left = pressed;
      if (e.code === 'ArrowRight') keyState.right = pressed;
      if (e.code === 'Space') keyState.space = pressed;
    }
    const keyDown = (e: KeyboardEvent) => onKey(e, true);
    const keyUp = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener('keydown', keyDown, { passive: true });
    window.addEventListener('keyup', keyUp, { passive: true });

    canvasEl.focus();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 pointer-events-none">
      <div className="absolute top-4 left-4 text-white text-xl pointer-events-none">
        {Array(livesState).fill('♥').join('')}
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-full pointer-events-auto"
        tabIndex={0}
      />
      <button
        className="absolute top-4 right-4 text-white text-3xl pointer-events-auto"
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  );
}
