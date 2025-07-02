<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-900 relative">
    <canvas
      width="480"
      height="640"
      class="bg-black"
    ></canvas>
    <div class="absolute top-2 left-2 text-white space-x-4">
      <span>Vidas: 0</span>
      <span>Puntuación: 0</span>
    </div>
  </div>
</template>

<script setup lang="ts">
// Game logic will be added here
</script>

<style scoped>
canvas {
  image-rendering: pixelated;
}
</style>
