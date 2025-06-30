<template>
  <div class="flex justify-center items-center min-h-screen bg-gray-900 relative">
    <canvas ref="canvasRef" class="max-w-[900px] w-full aspect-video bg-black"></canvas>
    <!-- HUD overlay -->
    <div class="absolute top-2 left-2 text-white space-x-4" v-if="!showModal">
      <span>Vidas: {{ lives }}</span>
      <span>Puntuación: {{ score }}</span>
      <span>Vídeos: {{ videosPlayed }}</span>
    </div>
    <!-- Modal de fin de partida -->
    <div v-if="showModal" class="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
      <div class="bg-gray-800 p-6 rounded-lg text-center text-white space-y-4">
        <h2 class="text-2xl font-bold">{{ victory ? '¡Victoria!' : 'Game Over' }}</h2>
        <button @click="resetGame" class="mt-2 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">Reiniciar</button>
      </div>
    </div>
    <!-- YouTube player oculto/fijo -->
    <div
      ref="ytRef"
      :class="['fixed bottom-4 right-4 w-72 rounded-xl shadow-xl overflow-hidden', { hidden: !ytVisible }]"
    ></div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'

const canvasRef = ref(null)
let ctx

// Sprites en SVG para aspecto 8 bits
const playerImg = new Image()
playerImg.src =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+CiAgPHJlY3QgeD0iNiIgeT0iMCIgd2lkdGg9IjQiIGhlaWdodD0iMiIgZmlsbD0iIzAwZmYwMCIvPgogIDxyZWN0IHg9IjQiIHk9IjIiIHdpZHRoPSI4IiBoZWlnaHQ9IjIiIGZpbGw9IiMwMGZmMDAiLz4KICA8cmVjdCB4PSIyIiB5PSI0IiB3aWR0aD0iMTIiIGhlaWdodD0iMiIgZmlsbD0iIzAwZmYwMCIvPgogIDxyZWN0IHg9IjAiIHk9IjYiIHdpZHRoPSIxNiIgaGVpZ2h0PSI0IiBmaWxsPSIjMDBmZjAwIi8+CiAgPHJlY3QgeD0iMiIgeT0iMTAiIHdpZHRoPSIxMiIgaGVpZ2h0PSIyIiBmaWxsPSIjMDBmZjAwIi8+CiAgPHJlY3QgeD0iNCIgeT0iMTIiIHdpZHRoPSI4IiBoZWlnaHQ9IjIiIGZpbGw9IiMwMGZmMDAiLz4KICA8cmVjdCB4PSI2IiB5PSIxNCIgd2lkdGg9IjQiIGhlaWdodD0iMiIgZmlsbD0iIzAwZmYwMCIvPgo8L3N2Zz4K'

const enemyImg = new Image()
enemyImg.src =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+CiAgPHJlY3QgeD0iNCIgeT0iMCIgd2lkdGg9IjgiIGhlaWdodD0iMiIgZmlsbD0iI2ZmMDAwMCIvPgogIDxyZWN0IHg9IjIiIHk9IjIiIHdpZHRoPSIxMiIgaGVpZ2h0PSIyIiBmaWxsPSIjZmYwMDAwIi8+CiAgPHJlY3QgeD0iMCIgeT0iNCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZjAwMDAiLz4KICA8cmVjdCB4PSIyIiB5PSI4IiB3aWR0aD0iMTIiIGhlaWdodD0iNCIgZmlsbD0iI2ZmMDAwMCIvPgogIDxyZWN0IHg9IjQiIHk9IjEyIiB3aWR0aD0iOCIgaGVpZ2h0PSIyIiBmaWxsPSIjZmYwMDAwIi8+CiAgPHJlY3QgeD0iNiIgeT0iMTQiIHdpZHRoPSI0IiBoZWlnaHQ9IjIiIGZpbGw9IiNmZjAwMDAiLz4KPC9zdmc+Cg=='
// Jugador
const player = reactive({ x: 0, y: 0, width: 40, height: 20 })

// Bala única
const bullet = reactive({ x: 0, y: 0, width: 4, height: 10, active: false })
const bulletSpeed = 6

// Enemigos
const rows = 5
const cols = 6
const enemySize = { width: 40, height: 30 }
let enemies = reactive([])
let enemyDir = 1
let enemySpeed = 1
const descendAmount = 20

// Puntuación y vidas
const score = ref(0)
const lives = ref(3)
const videosPlayed = ref(0)

// Control
const showModal = ref(false)
const victory = ref(false)
let animId

// IDs de videos
const videoIds = [
  'dQw4w9WgXcQ','9bZkp7q19f0','3JZ4pnNtyxQ','oHg5SJYRHA0','eY52Zsg-KVI',
  'L_jWHffIx5E','04854XqcfCY','J---aiyznGQ','fJ9rUzIMcZQ','2vjPBrBU-TM',
  'KxQZfWkP7K4','xvZqHgFz51I','PLr7lisfomBk','sNPnbI1arSE','Ttz17qjkh2A',
  'Sagg08DrO5U','60ItHLz5WEA','kXYiU_JCYtU','EDYufnQ6bJg','Az-mGR-CehY',
  'SR9EbxbYVFg','JGwWNGJdvx8','3AtDnEC4zak','euCqAq6BRa4','6Dh-RL__uN4',
  'eVTXPUF4Oz4','iIa5wgN6kCY','Kt_tLuszKBA','_Yhyp-_hX2s','tVj0ZTS4WF4'
]

// YouTube
const ytRef = ref(null)
const ytVisible = ref(false)
let ytPlayer
let apiLoaded = false

// Sonidos retro en Base64
const shootSound = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='
const explosionSound = 'data:audio/wav;base64,UklGRlIAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='
const soundsEnabled = ref(true)
function playSound(src) {
  if (!soundsEnabled.value) return
  const audio = new Audio(src)
  audio.play()
}

function initEnemies() {
  enemies.splice(0)
  const margin = 50
  const playSize = 16
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = margin + c * (enemySize.width + 20)
      const y = margin + r * (enemySize.height + 20)
      enemies.push({
        x,
        y,
        width: enemySize.width,
        height: enemySize.height,
        alive: true,
        videoId: videoIds[r * cols + c],
        playBox: {
          x: x + enemySize.width / 2 - playSize / 2,
          y: y + enemySize.height / 2 - playSize / 2,
          width: playSize,
          height: playSize
        }
      })
    }
  }
}

function resetGame() {
  score.value = 0
  lives.value = 3
  videosPlayed.value = 0
  enemyDir = 1
  enemySpeed = 1
  showModal.value = false
  victory.value = false
  initEnemies()
  player.x = canvasRef.value.width / 2 - player.width / 2
  player.y = canvasRef.value.height - player.height - 10
  bullet.active = false
  ytVisible.value = false
  animId = requestAnimationFrame(gameLoop)
}

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (apiLoaded) return resolve()
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true
      resolve()
    }
    document.body.appendChild(tag)
  })
}

function createPlayer() {
  ytPlayer = new YT.Player(ytRef.value, {
    height: '200',
    width: '100%',
    playerVars: { rel: 0, modestbranding: 1 }
  })
}

let keys = {}
function keydown(e) {
  keys[e.code] = true
  if (e.code === 'Space' && !bullet.active && !showModal.value) {
    bullet.x = player.x + player.width / 2 - bullet.width / 2
    bullet.y = player.y - bullet.height
    bullet.active = true
    playSound(shootSound)
  }
}
function keyup(e) { keys[e.code] = false }

function updatePlayer() {
  const speed = 5
  if (keys['ArrowLeft'] || keys['KeyA']) {
    player.x = Math.max(0, player.x - speed)
  }
  if (keys['ArrowRight'] || keys['KeyD']) {
    player.x = Math.min(canvasRef.value.width - player.width, player.x + speed)
  }
}

function updateBullet() {
  if (!bullet.active) return
  bullet.y -= bulletSpeed
  if (bullet.y < 0) bullet.active = false
}

function updateEnemies() {
  let shift = false
  for (const e of enemies) {
    if (!e.alive) continue
    e.x += enemyDir * enemySpeed
    e.playBox.x += enemyDir * enemySpeed
    if (e.x + e.width >= canvasRef.value.width - 10 || e.x <= 10) shift = true
  }
  if (shift) {
    enemyDir *= -1
    enemies.forEach(e => {
      e.y += descendAmount
      e.playBox.y += descendAmount
    })
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
        const hitsPlay =
          bullet.x < e.playBox.x + e.playBox.width &&
          bullet.x + bullet.width > e.playBox.x &&
          bullet.y < e.playBox.y + e.playBox.height &&
          bullet.y + bullet.height > e.playBox.y

        e.alive = false
        bullet.active = false
        score.value += 10
        if (hitsPlay) videosPlayed.value++
        playSound(explosionSound)
        if (hitsPlay && ytPlayer && e.videoId) {
          ytPlayer.loadVideoById(e.videoId)
          ytPlayer.playVideo()
          ytVisible.value = true
        }
        break
      }
    }
  }
  for (const e of enemies) {
    if (!e.alive) continue
    if (e.y + e.height >= player.y && e.x < player.x + player.width && e.x + e.width > player.x) {
      loseLife()
      e.alive = false
    } else if (e.y + e.height >= canvasRef.value.height) {
      gameOver()
    }
  }
}

function loseLife() {
  lives.value--
  if (lives.value <= 0) gameOver()
}

function gameOver() {
  showModal.value = true
  cancelAnimationFrame(animId)
}

function checkVictory() {
  if (enemies.every(e => !e.alive)) {
    victory.value = true
    showModal.value = true
    cancelAnimationFrame(animId)
  }
}

function draw() {
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  ctx.drawImage(playerImg, player.x, player.y, player.width, player.height)
  if (bullet.active) {
    ctx.fillStyle = '#ff0'
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
  }
  for (const e of enemies) {
    if (!e.alive) continue
    ctx.drawImage(enemyImg, e.x, e.y, e.width, e.height)
    // Símbolo de play
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.moveTo(e.playBox.x, e.playBox.y)
    ctx.lineTo(e.playBox.x, e.playBox.y + e.playBox.height)
    ctx.lineTo(e.playBox.x + e.playBox.width, e.playBox.y + e.playBox.height / 2)
    ctx.closePath()
    ctx.fill()
  }
}

function gameLoop() {
  updatePlayer()
  updateBullet()
  updateEnemies()
  checkCollisions()
  draw()
  checkVictory()
  if (!showModal.value) animId = requestAnimationFrame(gameLoop)
}

onMounted(async () => {
  const canvas = canvasRef.value
  ctx = canvas.getContext('2d')
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientWidth * 9 / 16
  player.x = canvas.width / 2 - player.width / 2
  player.y = canvas.height - player.height - 10
  initEnemies()
  window.addEventListener('keydown', keydown)
  window.addEventListener('keyup', keyup)
  await loadYouTubeAPI()
  createPlayer()
  animId = requestAnimationFrame(gameLoop)
})

onUnmounted(() => {
  window.removeEventListener('keydown', keydown)
  window.removeEventListener('keyup', keyup)
  cancelAnimationFrame(animId)
})
</script>

<style scoped>
canvas { image-rendering: pixelated; }
</style>

/* ➜ Instrucciones de uso
1. Registra el componente en tu router Vue asignando la ruta "/music" a MusicGalaxian.vue.
2. Edita la lista de IDs de YouTube en el array `videoIds` dentro del script.
3. Puedes tunear velocidad de enemigos (`enemySpeed`), tamaño de canvas y otras constantes al inicio del script. Los vídeos sólo se reproducen si disparas al triángulo de play dibujado sobre cada enemigo.
*/
