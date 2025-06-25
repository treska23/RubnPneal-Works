'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useRef, useState } from 'react';

interface Props {
  videoRects: DOMRect[];
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

export default function ArkanoidOverlay({
  videoRects,
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
    canvasNode.focus();
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    const bricks: Brick[] = [];
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
    function createBricks() {
      bricks.length = 0;
      videoRects.forEach((rect, idx) => {
        const around = bricksForRect(rect, canvasEl.width, canvasEl.height);
        bricks.push(...around);
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        bricks.push({
          x: cx - 30,
          y: cy - 10,
          w: 60,
          h: 20,
          alive: true,
          isTrigger: true,
          videoId: videoIds[idx],
          cooldown: 0,
        });
      });
    }

    let ballAttached = true;

    const paddle = { x: 0, w: 80, h: 10 };
    let leftPressed = false;
    let rightPressed = false;

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
      videoRects.forEach((rect, idx) => {
        const trigger = bricks.find(
          (b) => b.isTrigger && b.videoId === videoIds[idx],
        );
        if (trigger) {
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          trigger.x = cx - 30;
          trigger.y = cy - 10;
        }
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

      if (rightPressed && paddle.x < w - paddle.w) paddle.x += paddleSpeed;
      if (leftPressed && paddle.x > 0) paddle.x -= paddleSpeed;
      paddle.x = Math.max(0, Math.min(w - paddle.w, paddle.x));

      if (ballAttached) {
        stickBallToPaddle();
      } else {
        ball.x += ball.dx;
        ball.y += ball.dy;
      }

      if (ball.x < ball.r || ball.x > w - ball.r) ball.dx = -ball.dx;
      if (ball.y < ball.r || ball.y > h - ball.r) ball.dy = -ball.dy;

      for (let i = 0; i < bricks.length; i++) {
        const b = bricks[i];
        if (!b.alive && !b.isTrigger) continue;
        const hit =
          ball.x > b.x - ball.r &&
          ball.x < b.x + b.w + ball.r &&
          ball.y > b.y - ball.r &&
          ball.y < b.y + b.h + ball.r;
        if (!hit) continue;

        if (ball.dy > 0) ball.y = b.y - ball.r - 0.5;
        else ball.y = b.y + b.h + ball.r + 0.5;
        ball.dy = -ball.dy;

        if (b.isTrigger) {
          if (b.cooldown === 0) {
            b.cooldown = 20;
            setTimeout(() => onVideoHit(b.videoId!), 0);
          }
        } else {
          bricks.splice(i, 1);
          i--;
          if (bricks.every((bk) => bk.isTrigger) && !victory) {
            victory = true;
            startFireworks();
            setTimeout(onClose, 4000);
          }
        }
        break;
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

    const keyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') leftPressed = true;
      if (e.code === 'ArrowRight') rightPressed = true;
      if (e.code === 'Space' && ballAttached) {
        const dirX = Math.random() < 0.5 ? -1 : 1;
        ball.dx = dirX * baseSpeed * speedFactor || dirX * 2;
        ball.dy = -baseSpeed * speedFactor || -2;
        ballAttached = false;
      }
    };
    const keyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') leftPressed = false;
      if (e.code === 'ArrowRight') rightPressed = false;
    };
    window.addEventListener('keydown', keyDown, { passive: true });
    window.addEventListener('keyup', keyUp, { passive: true });

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
        tabIndex={-1}
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
