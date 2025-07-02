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
import { onMounted, ref } from 'vue';
import { drawMaze, levelMaps } from '@/vue/maze';
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

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    drawMaze(ctx, levelMaps[0]);
  }
});

// Game logic will use these actions

</script>

<style scoped>
canvas {
  image-rendering: pixelated;
}
</style>
