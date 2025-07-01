import { useEffect, useRef, useState } from 'react';
// Sprite sheet only contains the explosion frames
const SPRITE_SRC = '/sprites/galaxian_sprites.svg';

interface Props {
  videoIds: string[];
  onClose: () => void;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  alive: boolean;
  videoId: string;
  type: number;
}

export default function MusicGalaxianOverlay({ videoIds, onClose }: Props) {
  const DEBUG = true;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ytRef = useRef<HTMLDivElement>(null);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [videosPlayed, setVideosPlayed] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [victory, setVictory] = useState(false);
  const [ytVisible, setYtVisible] = useState(false);
  const player = useRef({ x: 0, y: 0, width: 40, height: 20 });
  const bullet = useRef({ x: 0, y: 0, width: 4, height: 10, active: false });
  const enemies = useRef<Enemy[]>([]);
  const enemyDir = useRef(1);
  const enemySpeed = useRef(1);
  const speedFactor = useRef(1);
  const animRef = useRef<number>(0);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [fps, setFps] = useState(0);
  const lastFrame = useRef(performance.now());
  const spriteImg = useRef<HTMLImageElement | null>(null);
  const explosions = useRef<{ x: number; y: number; start: number }[]>([]);
  const videoIframes = useRef<HTMLIFrameElement[]>([]);
  const ytReady = useRef(false);
  const rows = 5;
  const cols = 6;
  const baseDescend = 20;

  const FRAME_W = 16;
  const FRAME_H = 16;
  const explosionInfo = { sx: FRAME_W * 8, frames: 6 };
  const explosionSound =
    'data:audio/wav;base64,UklGRlIAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';

  function playSound(src: string) {
    new Audio(src).play();
  }

  // Visual definitions for player and enemies
  const playerColor = '#00e0ff';
  const enemyColors = ['#ff5555', '#55ff55', '#5599ff'];
  const playerPath = new Path2D(
    'M0 -10 L6 -2 L6 2 L8 6 L4 6 L4 8 L-4 8 L-4 6 L-8 6 L-6 2 L-6 -2 Z',
  );
  const enemyPaths = [
    new Path2D('M0 -8 L6 -2 L8 4 L6 8 L-6 8 L-8 4 L-6 -2 Z'),
    new Path2D('M0 -8 L8 -4 L8 4 L4 8 L-4 8 L-8 4 L-8 -4 Z'),
    new Path2D('M-8 -2 L0 -8 L8 -2 L6 8 L-6 8 Z'),
  ];

  function calcSpeedFactor() {
    const canvas = canvasRef.current!;
    return Math.min(Math.max((canvas.width / 900) * 1.5, 1), 3);
  }

  function onResize() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.clientWidth;
    canvas.height = (canvas.clientWidth * 9) / 16;
    speedFactor.current = calcSpeedFactor();
    enemySpeed.current = speedFactor.current;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(gameLoop);
  }

  function drawSprite(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    frame: number,
    x: number,
    y: number,
    w: number,
    h: number,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
  ) {
    ctx.drawImage(img, sx + frame * sw, sy, sw, sh, x, y, w, h);
  }

  function drawPath(
    ctx: CanvasRenderingContext2D,
    path: Path2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
  ) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(w / 20, h / 20);
    ctx.fillStyle = color;
    ctx.fill(path);
    ctx.restore();
  }

  function initEnemies() {
    enemies.current = [];
    const margin = 50;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        enemies.current.push({
          x: margin + c * (40 + 20),
          y: margin + r * (30 + 20),
          width: 40,
          height: 30,
          alive: true,
          videoId: videoIds[idx % videoIds.length],
          type: r % 3,
        });
      }
    }
  }

  function resetGame() {
    speedFactor.current = calcSpeedFactor();
    enemySpeed.current = speedFactor.current;
    setLives(3);
    setScore(0);
    setVideosPlayed(0);
    enemyDir.current = 1;
    setShowModal(false);
    setVictory(false);
    initEnemies();
    player.current.x = canvasRef.current!.width / 2 - player.current.width / 2;
    player.current.y = canvasRef.current!.height - player.current.height - 10;
    bullet.current.active = false;
    animRef.current = requestAnimationFrame(gameLoop);
  }

  const keys: Record<string, boolean> = {};
  function keydown(e: KeyboardEvent) {
    keys[e.code] = true;
    if (e.code === 'Space' && !bullet.current.active && !showModal) {
      bullet.current.x =
        player.current.x + player.current.width / 2 - bullet.current.width / 2;
      bullet.current.y = player.current.y - bullet.current.height;
      bullet.current.active = true;
    }
  }
  function keyup(e: KeyboardEvent) {
    keys[e.code] = false;
  }

  function updatePlayer() {
    const speed = 5 * speedFactor.current;
    if (keys['ArrowLeft'] || keys['KeyA']) {
      player.current.x = Math.max(0, player.current.x - speed);
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
      player.current.x = Math.min(
        canvasRef.current!.width - player.current.width,
        player.current.x + speed,
      );
    }
  }

  function updateBullet() {
    if (!bullet.current.active) return;
    bullet.current.y -= 6 * speedFactor.current;
    if (bullet.current.y < 0) bullet.current.active = false;
  }

  function updateEnemies() {
    let shift = false;
    for (const e of enemies.current) {
      if (!e.alive) continue;
      e.x += enemyDir.current * enemySpeed.current;
      if (e.x + e.width >= canvasRef.current!.width - 10 || e.x <= 10)
        shift = true;
    }
    if (shift) {
      enemyDir.current *= -1;
      enemies.current.forEach((e) => {
        e.y += baseDescend * speedFactor.current;
      });
    }
  }

  function gameOver() {
    setShowModal(true);
    cancelAnimationFrame(animRef.current!);
  }

  function loseLife() {
    setLives((l) => {
      if (l - 1 <= 0) gameOver();
      return l - 1;
    });
  }

  function checkCollisions() {
    if (bullet.current.active) {
      for (const e of enemies.current) {
        if (
          e.alive &&
          bullet.current.x < e.x + e.width &&
          bullet.current.x + bullet.current.width > e.x &&
          bullet.current.y < e.y + e.height &&
          bullet.current.y + bullet.current.height > e.y
        ) {
          e.alive = false;
          bullet.current.active = false;
          setScore((s) => s + 10);
          setVideosPlayed((v) => v + 1);
          explosions.current.push({ x: e.x, y: e.y, start: performance.now() });
          new Audio(explosionSound).play();
          if (
            (window as any).YT &&
            ytPlayerRef.current &&
            typeof ytPlayerRef.current.loadVideoById === 'function'
          ) {
            ytPlayerRef.current.loadVideoById(e.videoId);
          }
          break;
        }
      }
    }
    for (const e of enemies.current) {
      if (!e.alive) continue;
      if (
        e.y + e.height >= player.current.y &&
        e.x < player.current.x + player.current.width &&
        e.x + e.width > player.current.x
      ) {
        loseLife();
        e.alive = false;
      } else if (e.y + e.height >= canvasRef.current!.height) {
        gameOver();
      }
    }
  }

  function checkVideoCollisions() {
    if (!bullet.current.active) return;
    for (const iframe of videoIframes.current) {
      if (ytRef.current && ytRef.current.contains(iframe)) continue;
      const rect = iframe.getBoundingClientRect();
      if (
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth
      ) {
        continue;
      }
      const size = 40;
      const x = rect.left + rect.width / 2 - size / 2;
      const y = rect.top + rect.height / 2 - size / 2;
      if (
        bullet.current.x < x + size &&
        bullet.current.x + bullet.current.width > x &&
        bullet.current.y < y + size &&
        bullet.current.y + bullet.current.height > y
      ) {
        iframe.contentWindow?.postMessage(
          { event: 'command', func: 'playVideo' },
          '*',
        );
        setVideosPlayed((v) => v + 1);
        setYtVisible(true);
        bullet.current.active = false;
        playSound(explosionSound);
        break;
      }
    }
  }

  function checkVictory() {
    if (enemies.current.every((e) => !e.alive)) {
      setVictory(true);
      setShowModal(true);
      cancelAnimationFrame(animRef.current!);
    }
  }

  function draw() {
    const ctx = ctxRef.current!;
    ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    if (!spriteImg.current) return;
    drawPath(
      ctx,
      playerPath,
      player.current.x,
      player.current.y,
      player.current.width,
      player.current.height,
      playerColor,
    );
    if (bullet.current.active) {
      ctx.fillStyle = '#ff0';
      ctx.fillRect(
        bullet.current.x,
        bullet.current.y,
        bullet.current.width,
        bullet.current.height,
      );
    }
    for (const e of enemies.current) {
      if (!e.alive) continue;
      drawPath(
        ctx,
        enemyPaths[e.type % enemyPaths.length],
        e.x,
        e.y,
        e.width,
        e.height,
        enemyColors[e.type % enemyColors.length],
      );
    }
    for (let i = explosions.current.length - 1; i >= 0; i--) {
      const ex = explosions.current[i];
      const frame = Math.floor((performance.now() - ex.start) / 300);
      if (frame >= explosionInfo.frames) {
        explosions.current.splice(i, 1);
        continue;
      }
      drawSprite(
        ctx,
        spriteImg.current,
        frame,
        ex.x,
        ex.y,
        40,
        30,
        explosionInfo.sx,
        0,
        FRAME_W,
        FRAME_H,
      );
    }
  }

  function gameLoop() {
    enemies.current = enemies.current.filter((e) => e.alive);
    const now = performance.now();
    updatePlayer();
    updateBullet();
    updateEnemies();
    checkCollisions();
    checkVideoCollisions();
    draw();
    checkVictory();
    if (DEBUG) {
      setFps(Math.round(1000 / (now - lastFrame.current)));
      lastFrame.current = now;
    }
    if (!showModal) animRef.current = requestAnimationFrame(gameLoop);
  }

  function loadYouTubeAPI() {
    return new Promise<void>((resolve) => {
      if ((window as any).YT) return resolve();
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      (window as any).onYouTubeIframeAPIReady = () => {
        resolve();
      };
      document.body.appendChild(tag);
    });
  }

  const ytPlayerRef = useRef<any>(null); // Holds the YouTube Player instance

  function createPlayer() {
    ytPlayerRef.current = new (window as any).YT.Player(ytRef.current, {
      height: '200',
      width: '100%',
      playerVars: { rel: 0, modestbranding: 1 },
      events: {
        onReady: () => {
          ytReady.current = true;
        },
        onStateChange: (ev: any) => {
          if (ev.data === (window as any).YT.PlayerState.PLAYING) {
            setYtVisible(true);
          }
        },
      },
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ctxRef.current = canvas.getContext('2d');
    canvas.width = canvas.clientWidth;
    canvas.height = (canvas.clientWidth * 9) / 16;
    spriteImg.current = Object.assign(new Image(), { src: SPRITE_SRC });
    speedFactor.current = calcSpeedFactor();
    enemySpeed.current = speedFactor.current;
    player.current.x = canvas.width / 2 - player.current.width / 2;
    player.current.y = canvas.height - player.current.height - 10;
    initEnemies();
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('resize', onResize);
    loadYouTubeAPI().then(() => {
      createPlayer();
      videoIframes.current = Array.from(
        document.querySelectorAll<HTMLIFrameElement>(
          'iframe[src*="youtube.com/embed"]',
        ),
      ).filter((el) => !ytRef.current?.contains(el));
      animRef.current = requestAnimationFrame(gameLoop);
    });

    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animRef.current!);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90">
      <div className="absolute top-2 left-2 text-white space-x-4">
        <span>Vidas: {lives}</span>
        <span>Puntuación: {score}</span>
        <span>Vídeos: {videosPlayed}</span>
      </div>
      {DEBUG && (
        <div className="absolute top-2 right-2 text-white">FPS: {fps}</div>
      )}
      {showModal && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white space-y-4">
          <h2 className="text-2xl font-bold">
            {victory ? '¡Victoria!' : 'Game Over'}
          </h2>
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            Reiniciar
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
          >
            Cerrar
          </button>
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-full" />
      <div
        ref={ytRef}
        className={`fixed bottom-4 right-4 w-72 rounded-xl shadow-xl overflow-hidden ${ytVisible ? '' : 'hidden'}`}
      ></div>
      <button
        className="absolute top-4 right-4 text-white text-3xl"
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  );
}
