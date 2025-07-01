<template>
  <div
    class="flex justify-center items-center min-h-screen bg-gray-900 relative"
  >
    <canvas
      ref="canvasRef"
      class="max-w-[900px] w-full aspect-video bg-black"
    ></canvas>
    <div class="absolute top-2 left-2 text-white space-x-4" v-if="!showModal">
      <span>Vidas: {{ lives }}</span>
      <span>Puntuación: {{ score }}</span>
      <span>Vídeos: {{ videosPlayed }}</span>
      <span v-if="DEBUG">FPS: {{ fps }}</span>
    </div>
    <div
      v-if="showModal"
      class="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center"
    >
      <div class="bg-gray-800 p-6 rounded-lg text-center text-white space-y-4">
        <h2 class="text-2xl font-bold">
          {{ victory ? '¡Victoria!' : 'Game Over' }}
        </h2>
        <button
          @click="resetGame"
          class="mt-2 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
        >
          Reiniciar
        </button>
      </div>
    </div>
    <div
      ref="ytRef"
      :class="[
        'fixed bottom-4 right-4 w-72 rounded-xl shadow-xl overflow-hidden',
        { hidden: !ytVisible },
      ]"
    ></div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
const particles = reactive([]);
const DEBUG = false;
const fps = ref(0);
let lastTime = performance.now();

const { playerSheet, enemySheets, explosionSheet } = useSprites();

const canvasRef = ref(null);
let ctx;

const ytRef = ref(null);
const ytVisible = ref(false);
let ytPlayer;
let apiLoaded = false;

const videoIds = [
  'dQw4w9WgXcQ',
  '9bZkp7q19f0',
  '3JZ4pnNtyxQ',
  'oHg5SJYRHA0',
  'eY52Zsg-KVI',
  'L_jWHffIx5E',
  '04854XqcfCY',
  'J---aiyznGQ',
  'fJ9rUzIMcZQ',
  '2vjPBrBU-TM',
  'KxQZfWkP7K4',
  'xvZqHgFz51I',
  'PLr7lisfomBk',
  'sNPnbI1arSE',
  'Ttz17qjkh2A',
  'Sagg08DrO5U',
  '60ItHLz5WEA',
  'kXYiU_JCYtU',
  'EDYufnQ6bJg',
  'Az-mGR-CehY',
  'SR9EbxbYVFg',
  'JGwWNGJdvx8',
  '3AtDnEC4zak',
  'euCqAq6BRa4',
  '6Dh-RL__uN4',
  'eVTXPUF4Oz4',
  'iIa5wgN6kCY',
  'Kt_tLuszKBA',
  '_Yhyp-_hX2s',
  'tVj0ZTS4WF4',
];

const difficulty = { lives: 3, shotDelay: 350 };

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const speedFactor = ref(1);

const baseEnemySpeed = 1;
const baseBulletSpeed = 6;
const baseDescendInterval = 1000;
let enemySpeed = baseEnemySpeed;
let bulletSpeed = baseBulletSpeed;
let descendInterval = baseDescendInterval;
let lastDescend = 0;

const player = reactive({ x: 0, y: 0, width: 40, height: 20 });
const bullet = reactive({ x: 0, y: 0, width: 4, height: 10, active: false });
let lastShot = 0;

const rows = 5;
const cols = 6;
const enemySize = { width: 40, height: 30 };
let enemies = reactive([]);
let enemyDir = 1;

const explosions = reactive([]);

const score = ref(0);
const lives = ref(difficulty.lives);
const videosPlayed = ref(0);
const showModal = ref(false);
const victory = ref(false);
let animId;

const shootSound =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
const explosionSound =
  'data:audio/wav;base64,UklGRlIAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
const soundsEnabled = ref(false);
function playSound(src) {
  if (!soundsEnabled.value) return;
  new Audio(src).play();
}

function spawnPixelExplosion(cx, cy, baseColor) {
  const N = 30; // nº de partículas
  for (let i = 0; i < N; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1; // 1-4 px/frame
    particles.current.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 600, // ms
      color: baseColor,
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.current.length - 1; i >= 0; i--) {
    const p = particles.current[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= dt;
    if (p.life <= 0) particles.current.splice(i, 1);
  }
}

function drawSprite(ctx, sheet, frame, x, y, w, h) {
  const fw = sheet.img.width / sheet.frames;
  ctx.drawImage(sheet.img, frame * fw, 0, fw, sheet.img.height, x, y, w, h);
}

function updateScale() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  canvas.width = canvas.clientWidth;
  canvas.height = (canvas.clientWidth * 9) / 16;
  const baseFactor = canvas.width / 900;
  // Nuevo factor: +50 % respecto a v2
  speedFactor.value = clamp(baseFactor * 1.5, 1.0, 3.0);
  enemySpeed = baseEnemySpeed * speedFactor.value;
  bulletSpeed = baseBulletSpeed * speedFactor.value;
  descendInterval = baseDescendInterval / speedFactor.value;
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - player.height - 10;
}

function initEnemies() {
  enemies.splice(0);
  const margin = 50 * speedFactor.value;
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = margin + c * (enemySize.width + 20);
      const y = margin + r * (enemySize.height + 20);
      enemies.push({
        x,
        y,
        width: enemySize.width,
        height: enemySize.height,
        alive: true,
        type: r % 3,
        videoId: videoIds[idx++],
      });
    }
  }
}

function resetGame() {
  cancelAnimationFrame(animId); // Evitaba freeze por múltiples bucles activos
  score.value = 0;
  lives.value = difficulty.lives;
  videosPlayed.value = 0;
  enemyDir = 1;
  showModal.value = false;
  victory.value = false;
  bullet.active = false;
  explosions.splice(0);
  soundsEnabled.value = false;
  updateScale();
  initEnemies();
  lastDescend = performance.now();
  lastShot = 0;
  animId = requestAnimationFrame(gameLoop);
}

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (apiLoaded) return resolve();
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true;
      resolve();
    };

    document.body.appendChild(tag);
  });
}

function createPlayer() {
  ytPlayer = new YT.Player(ytRef.value, {
    height: '200',
    width: '100%',
    playerVars: { rel: 0, modestbranding: 1 },
  });
  ytPlayer.addEventListener('onStateChange', (e) => {
    if (e.data === YT.PlayerState.PLAYING) {
      soundsEnabled.value = true;
    }
  });
}

let keys = {};
function keydown(e) {
  keys[e.code] = true;
  if (
    e.code === 'Space' &&
    !bullet.active &&
    !showModal.value &&
    performance.now() - lastShot > difficulty.shotDelay
  ) {
    bullet.x = player.x + player.width / 2 - bullet.width / 2;
    bullet.y = player.y - bullet.height;
    bullet.active = true;
    playSound(shootSound);
    lastShot = performance.now();
  }
}
function keyup(e) {
  keys[e.code] = false;
}

function updatePlayer() {
  const speed = 5 * speedFactor.value;
  if (keys['ArrowLeft'] || keys['KeyA'])
    player.x = Math.max(0, player.x - speed);
  if (keys['ArrowRight'] || keys['KeyD'])
    player.x = Math.min(canvasRef.value.width - player.width, player.x + speed);
}

function updateBullet() {
  if (!bullet.active) return;
  bullet.y -= bulletSpeed;
  if (bullet.y < 0) bullet.active = false;
}

function updateEnemies() {
  let shift = false;
  for (const e of enemies) {
    if (!e.alive) continue;
    e.x += enemyDir * enemySpeed;
    if (e.x + e.width >= canvasRef.value.width - 10 || e.x <= 10) shift = true;
  }
  if (shift || performance.now() - lastDescend > descendInterval) {
    enemyDir *= -1;
    for (const e of enemies) {
      e.y += 20 * speedFactor.value;
    }
    lastDescend = performance.now();
  }
}

function updateExplosions(now) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const ex = explosions[i];
    const frame = Math.floor((now - ex.start) / 60);
    if (frame >= explosionSheet.frames) {
      explosions.splice(i, 1);
    } else ex.frame = frame;
  }
}

function checkCollisions() {
  if (bullet.active) {
    for (const e of enemies) {
      if (
        e.alive &&
        bullet.x < e.x + e.width &&
        bullet.x + bullet.width > e.x &&
        bullet.y < e.y + e.height &&
        bullet.y + bullet.height > e.y
      ) {
        const hitPlay =
          bullet.x < e.x + e.width / 2 + 8 &&
          bullet.x + bullet.width > e.x + e.width / 2 - 8 &&
          bullet.y < e.y + e.height / 2 + 8 &&
          bullet.y + bullet.height > e.y + e.height / 2 - 8;
        e.alive = false;
        bullet.active = false;
        score.value += 10;
        new Audio(explosionSound).play();

        if (hitPlay) {
          videosPlayed.value++;
          if (ytPlayer && e.videoId) {
            // reproducir en el reproductor flotante
            ytPlayer.loadVideoById(e.videoId);
            ytVisible.value = true;
          } else {
            // buscar el iframe miniatura correspondiente
            const iframe = document.querySelector(
              `iframe[src*="${e.videoId}"]`,
            );
            if (iframe && iframe.contentWindow) {
              iframe.contentWindow.postMessage(
                JSON.stringify({
                  event: 'command',
                  func: 'playVideo',
                  args: [],
                }),
                'https://www.youtube.com',
              );
            }
          }
        }
        break;
      }
    }
  }
}

function loseLife() {
  lives.value--;
  if (lives.value <= 0) gameOver();
}

function gameOver() {
  showModal.value = true;
  cancelAnimationFrame(animId);
}

function checkVictory() {
  if (enemies.every((e) => !e.alive)) {
    victory.value = true;
    showModal.value = true;
    cancelAnimationFrame(animId);
  }
}

function draw(now) {
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
  const pFrame = bullet.active ? 1 : 0;
  drawSprite(
    ctx,
    playerSheet,
    pFrame,
    player.x,
    player.y,
    player.width,
    player.height,
  );
  if (bullet.active) {
    ctx.fillStyle = '#ff0';
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  }
  const eFrame = Math.floor(now / 300) % 2;
  for (const e of enemies) {
    if (!e.alive) continue;
    drawSprite(ctx, enemySheets[e.type], eFrame, e.x, e.y, e.width, e.height);
  }
  for (const ex of explosions) {
    drawSprite(
      ctx,
      explosionSheet,
      ex.frame,
      ex.x,
      ex.y,
      enemySize.width,
      enemySize.height,
    );
  }
  for (const p of particles.current) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 2, 2); // cuadrado de 2 px
  }
}

function gameLoop(now) {
  if (DEBUG) console.time('loop');
  updateParticles(now - lastTime);
  updatePlayer();
  updateBullet();
  updateEnemies();
  updateParticles(now - lastFrame.current);
  checkCollisions();
  updateExplosions(now);
  draw(now);
  checkVictory();
  if (DEBUG) {
    fps.value = Math.round(1000 / (now - lastTime));
    lastTime = now;
    console.timeEnd('loop');
  }
  if (!showModal.value) animId = requestAnimationFrame(gameLoop);
}

onMounted(async () => {
  const canvas = canvasRef.value;
  ctx = canvas.getContext('2d');
  updateScale();
  initEnemies();
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('resize', updateScale);

  await loadYouTubeAPI();
  createPlayer();
  animId = requestAnimationFrame(gameLoop);
});

onUnmounted(() => {
  window.removeEventListener('keydown', keydown);
  window.removeEventListener('keyup', keyup);
  window.removeEventListener('resize', updateScale);
  cancelAnimationFrame(animId);
  if (ytPlayer && ytPlayer.destroy) ytPlayer.destroy();
});

function useSprites() {
  const base = {
    player:
      'iVBORw0KGgoAAAANSUhEUgAAACAAAAAQCAYAAAB3AH1ZAAAAR0lEQVR4nO2TwQoAIAhDtf//59e5xEJCPOs7uskYTKT5HfUOAItQ1dW++EfkaQYm1Z7cGC5NRP3lDXSAXkEqIIAcV1HeQAeYuY0eDnNvsPYAAAAASUVORK5CYII=',
    enemy1:
      'iVBORw0KGgoAAAANSUhEUgAAACAAAAAQCAYAAAB3AH1ZAAAAS0lEQVR4nGNgGAUjHTASUvCfgeE/Fk1U08dEyCBaA7wOwOYLfOLk6Bu8IUBNX+KTx+kAQgkNlzyp+gZvFDAwUM+X+MQHPARGwYADAJVpFBIj3NO1AAAAAElFTkSuQmCC',
    enemy2:
      'iVBORw0KGgoAAAANSUhEUgAAACAAAAAQCAYAAAB3AH1ZAAAAMklEQVR4nGNgGAUjHTBiCv3/T4Q2LPrg2gnrZ0ToZyJsGW3BqANGHTDqgAF3wCgYcAAAZ5MFEqQDgFAAAAAASUVORK5CYII=',
    enemy3:
      'iVBORw0KGgoAAAANSUhEUgAAACAAAAAQCAYAAAB3AH1ZAAAAWUlEQVR4nO2UwQoAIAhDtS/vz+0qqbNLGOROwWs2RSJq/S6GdJKoM77rSZSffb9fVD9sWR5EgH8LMtJil2UDoO5POOre4Q9OoDxAtmQZD7Y94uUTKP8HWuVaaUMUEAMoHusAAAAASUVORK5CYII=',
    explosion:
      'iVBORw0KGgoAAAANSUhEUgAAAGAAAAAQCAYAAADpunr5AAAAv0lEQVR4nO2XSw6AIAxEp16T83FOXJEYYstHsK3yEjdasMwABcJHSRGpfEcB1BP/BmxCXmkRsjRCS3zAsAG9M5hrw5H70hQfMGqAJApngraQoyw14CpKbfbeteGwtIU8ZYkBIzO41k7qx7MBh/QxRaT8rE6k9x853rP4gGBAObDWgdbivAs2G3EFbNazDVCGNaAslq2nmFpcaz9/YZ+ClNn3AGVMbgd/ugmbLMKcyNIq6q0tFEAW6pF6ArPxtoWdEu9lGNRUkp0AAAAASUVORK5CYII=',
  };
  const toSheet = (src, frames) => ({
    img: Object.assign(new Image(), { src: 'data:image/png;base64,' + src }),
    frames,
  });
  return {
    playerSheet: toSheet(base.player, 2),
    enemySheets: [
      toSheet(base.enemy1, 2),
      toSheet(base.enemy2, 2),
      toSheet(base.enemy3, 2),
    ],
    explosionSheet: toSheet(base.explosion, 6),
  };
}
</script>

<style scoped>
canvas {
  image-rendering: pixelated;
}
</style>
