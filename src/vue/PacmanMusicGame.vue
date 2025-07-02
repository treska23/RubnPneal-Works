<template>
  <div
    class="flex items-center justify-center min-h-screen bg-gray-900 relative"
  >
    <canvas ref="canvasRef" width="480" height="640" class="bg-black"></canvas>
    <div class="absolute top-2 left-2 text-white space-x-4">
      <span>Vidas: {{ state.lives }}</span>
      <span>Puntuación: {{ state.score }}</span>
      <span>Nivel: {{ state.level }}</span>
      <span v-if="currentTitle">Música: {{ currentTitle }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameState } from '@/vue/gameState';
import { onMounted, ref, watch, onUnmounted } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { levelMaps } from '@/vue/maze';
import { usePlayer } from '@/vue/usePlayer';
import { useGhostAI } from '@/vue/useGhostAI';
import { usePelletManager } from '@/vue/usePelletManager';
import { useGameLoop } from '@/vue/useGameLoop';
import { playRandomTrack, useSpotify } from '@/lib/spotify';

const { state, addScore, nextLevel, loseLife, resetGame } = useGameState();
const { token } = useSpotify();

const songsByLevel = [
  [
    { id: '5Q3jx7MeOdXMORcYRVrZCr', title: 'Quasar' },
    { id: '2ZR3fNmXvvCEM7c1NBQc8I', title: 'Nebula' },
  ],
];

const currentTitle = ref('');

async function onBigPellet() {
  if (!token.value) return;
  try {
    await fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token.value}` },
    });
  } catch (err) {
    console.warn('Failed to pause track:', err);
  }

  const levelIdx = state.level - 1;
  const level = songsByLevel[levelIdx] ?? songsByLevel[0];
  const trackId = await playRandomTrack(
    level.map((s) => s.id),
    token.value,
    `level-${state.level}`,
  );
  const song = level.find((s) => s.id === trackId);
  if (song) currentTitle.value = song.title;
}

const canvasRef = ref<HTMLCanvasElement | null>(null);
const ctx = ref<CanvasRenderingContext2D | null>(null);

let levelMap = levelMaps[0].map(row => [...row]);
const TILE_SIZE = 32;

const player = usePlayer(levelMap, TILE_SIZE);
const ghostAI = useGhostAI(levelMap, TILE_SIZE, player.state);
const pelletManager = usePelletManager(levelMap, TILE_SIZE);

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  ctx.value = canvas.getContext('2d');
  window.addEventListener('keydown', onKeydown);
});

const loopOptions = {
  ctx,
  levelMap,
  tileSize: TILE_SIZE,
  player,
  ghosts: ghostAI,
  pellets: {
    handlePelletCollision: (p: any) => pelletManager.handlePelletCollision(p, onBigPellet),
  },
};

const { pause, resume } = useGameLoop(loopOptions);

const paused = ref(false);

function togglePause() {
  if (paused.value) {
    resume();
    if (token.value) {
      fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token.value}` },
      }).catch((err) => console.warn('Failed to resume track:', err));
    }
  } else {
    pause();
    if (token.value) {
      fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token.value}` },
      }).catch((err) => console.warn('Failed to pause track:', err));
    }
  }
  paused.value = !paused.value;
}

function onKeydown(e: KeyboardEvent) {
  if (e.code === 'Escape') {
    e.preventDefault();
    togglePause();
  }
}

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  pause();
});

onBeforeRouteLeave(() => {
  window.removeEventListener('keydown', onKeydown);
  pause();
});

function checkLevelComplete() {
  if (pelletManager.pelletsLeft.value > 0) return;
  nextLevel();
  levelMap = levelMaps[(state.level - 1) % levelMaps.length].map(r => [...r]);
  pelletManager.reset(levelMap);
  player.setLevelMap(levelMap);
  player.setPosition(TILE_SIZE, TILE_SIZE);
  ghostAI.reset(levelMap);
  loopOptions.levelMap = levelMap;
  currentTitle.value = '';
  onBigPellet();
}

watch(pelletManager.pelletsLeft, checkLevelComplete);


</script>

<style scoped>
canvas {
  image-rendering: pixelated;
}
</style>
