import { useEffect, useRef, useState } from 'react';

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
}

export default function MusicGalaxianOverlay({ videoIds, onClose }: Props) {
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
  const animRef = useRef<number | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const rows = 5;
  const cols = 6;
  const descendAmount = 20;

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
        });
      }
    }
  }

  function resetGame() {
    setLives(3);
    setScore(0);
    setVideosPlayed(0);
    enemyDir.current = 1;
    enemySpeed.current = 1;
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
    const speed = 5;
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
    bullet.current.y -= 6;
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
        e.y += descendAmount;
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
          setYtVisible(true);
          if ((window as any).YT && ytPlayerRef.current) {
            ytPlayerRef.current.loadVideoById(e.videoId);
            ytPlayerRef.current.playVideo();
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
    ctx.fillStyle = '#0f0';
    ctx.fillRect(
      player.current.x,
      player.current.y,
      player.current.width,
      player.current.height,
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
    ctx.fillStyle = '#f00';
    for (const e of enemies.current) {
      if (e.alive) ctx.fillRect(e.x, e.y, e.width, e.height);
    }
  }

  function gameLoop() {
    updatePlayer();
    updateBullet();
    updateEnemies();
    checkCollisions();
    draw();
    checkVictory();
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

  const ytPlayerRef = useRef<any>(null);
  function createPlayer() {
    ytPlayerRef.current = new (window as any).YT.Player(ytRef.current, {
      height: '200',
      width: '100%',
      playerVars: { rel: 0, modestbranding: 1 },
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ctxRef.current = canvas.getContext('2d');
    canvas.width = canvas.clientWidth;
    canvas.height = (canvas.clientWidth * 9) / 16;
    player.current.x = canvas.width / 2 - player.current.width / 2;
    player.current.y = canvas.height - player.current.height - 10;
    initEnemies();
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    loadYouTubeAPI().then(() => {
      createPlayer();
      animRef.current = requestAnimationFrame(gameLoop);
    });

    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
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
