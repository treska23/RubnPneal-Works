'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useRef, useState } from 'react';
import { qs } from '@/lib/safe-dom';
import { isMobile } from '@/helpers/is-mobile';

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
  disabled?: boolean;
  hideUntil?: number;
}

const TRIGGER_COOLDOWN_MS = 1500; // 1.5 s invisibles

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
    const HEADER_H = 180;
    let mobile = isMobile();
    let lastMobile = mobile;

    const canvasNode = canvasRef.current;
    if (!canvasNode) return;
    const canvasEl = canvasNode as HTMLCanvasElement;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    let bricks: Brick[] = [];
    let triggers: Brick[] = [];
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
      qs<HTMLElement>(document, `[data-video-id="${id}"]`),
    );

    function buildBricks() {
      bricks = [];
      triggers = [];
      const cvRect = canvasEl.getBoundingClientRect();
      domElems.forEach((el, idx) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2 - 30 - cvRect.left;
        const cy = rect.top + rect.height / 2 - 10 - cvRect.top;
        triggers.push({
          x: cx,
          y: cy,
          w: 60,
          h: 20,
          isTrigger: true,
          videoId: videoIds[idx],
          disabled: false,
          hideUntil: 0,
          alive: true,
        });
      });

      const overlap = (x1: number, w1: number, x2: number, w2: number) =>
        !(x1 + w1 < x2 || x2 + w2 < x1);

      const cols = Math.floor(canvasEl.width / 64);
      for (let row = 0; row < 3; row++) {
        for (let c = 0; c < cols; c++) {
          const x = c * 64 + 2;
          const y = 20 + row * 26;
          if (triggers.some((t) => overlap(x, 60, t.x, 60))) continue;
          const brick = { x, y, w: 60, h: 20, alive: true };
          if (brick.y < HEADER_H) bricks.push(brick);
        }
      }
      return bricks;
    }

    let ballAttached = true;

    const paddle = { x: 0, y: 0, w: 80, h: 10 };
    const keyState = { left: false, right: false, space: false };

    const ball = {
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
      r: 8,
    };

    function stickBallToPaddle() {
      paddle.y = canvasEl.height - 32;
      ball.x = paddle.x + paddle.w / 2;
      ball.y = paddle.y - ball.r - 2;
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

      mobile = isMobile();
      if (lastMobile !== mobile) {
        bricks = buildBricks();
        lastMobile = mobile;
      }

      const maxDim = Math.max(window.innerWidth, window.innerHeight);
      speedFactor = maxDim / 800;
      paddleSpeed = basePaddleSpeed * speedFactor || 6;
      paddle.x = canvasEl.width / 2 - paddle.w / 2;
      paddle.y = canvasEl.height - 32;
      if (lastMobile === mobile) bricks = buildBricks();
      ballAttached = true;
      ball.dx = ball.dy = 0;
      stickBallToPaddle();
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let animationId: number;

    const draw = () => {
      const cv = canvasEl.getBoundingClientRect();
      triggers.forEach((tr) => {
        const dom = document.querySelector<HTMLElement>(
          `[data-video-id="${tr.videoId}"]`,
        );
        if (!dom) return;
        const r = dom.getBoundingClientRect();
        tr.x = r.left + r.width / 2 - 30 - cv.left;
        tr.y = r.top + r.height / 2 - 10 - cv.top;
      });
      const now = performance.now();
      triggers.forEach((t) => {
        if (t.disabled && now >= (t.hideUntil ?? 0)) {
          t.disabled = false;
        }
      });
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

      ctx.fillStyle = 'white';
      ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      bricks.forEach((b) => {
        if (!b.alive) return;
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(b.x, b.y, b.w, b.h);
      });
      triggers.forEach((t) => {
        if (t.disabled) return;
        ctx.fillStyle = '#db2777';
        ctx.fillRect(t.x, t.y, t.w, t.h);
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

      const w = canvasEl.width;
      const h = canvasEl.height;

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
      if (ball.y > h - ball.r) ball.dy = -ball.dy;
      if (ball.y - ball.r < 0) {
        ball.y = ball.r;
        ball.dy = -ball.dy;
      }
      const bricksToDelete: Brick[] = [];
      bricks.forEach((b) => {
        if (!b.alive) return;
        if (!hitAABB(ball, b)) return;
        b.alive = false; // 🔸  ya no se dibujará más
        ball.dy = -ball.dy;
      });
      bricks = bricks.filter((b) => b.alive);

      triggers.forEach((tr) => {
        if (hitAABB(ball, tr) && !tr.disabled) {
          onVideoHit(tr.videoId!);
          ball.dy = -ball.dy;
          tr.disabled = true;
          tr.hideUntil = performance.now() + TRIGGER_COOLDOWN_MS;
        }
      });
      bricks = bricks.filter((b) => !bricksToDelete.includes(b));
      if (bricks.length === 0 && bricksToDelete.length > 0 && !victory) {
        victory = true;
        startFireworks();
        setTimeout(onClose, 4000);
      }
      const paddleY = paddle.y;
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
