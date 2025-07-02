<template>
  <div
    class="flex items-center justify-center min-h-screen bg-gray-900 relative"
  >
    <canvas width="480" height="640" class="bg-black"></canvas>
    <div class="absolute top-2 left-2 text-white space-x-4">
      <span>Vidas: {{ state.lives }}</span>
      <span>Puntuación: {{ state.score }}</span>
      <span>Nivel: {{ state.level }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameState } from '@/vue/gameState';

const { state, addScore, nextLevel, loseLife, resetGame } = useGameState();

// Game logic will use these actions

</script>

<style scoped>
canvas {
  image-rendering: pixelated;
}
</style>
