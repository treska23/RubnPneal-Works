<template>
  <div
    class="flex items-center justify-center min-h-screen bg-gray-900 relative"
  >
    <canvas ref="canvasRef" width="480" height="640" class="bg-black"></canvas>
    <div class="absolute top-2 left-2 text-white space-x-4">
      <span>Vidas: {{ state.lives }}</span>
      <span>Puntuación: {{ state.score }}</span>
      <span>Nivel: {{ state.level }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameState } from '@/vue/gameState';
import { onMounted, ref } from 'vue';
import { drawMaze, levelMaps } from '@/vue/maze';

const { state, addScore, nextLevel, loseLife, resetGame } = useGameState();

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
