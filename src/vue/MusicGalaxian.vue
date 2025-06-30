<template>
  <div class="flex justify-center items-center min-h-screen bg-gray-900 relative">
    <canvas ref="canvasRef" class="max-w-[900px] w-full aspect-video bg-black"></canvas>
    <div class="absolute top-2 left-2 text-white space-x-4" v-if="!showModal">
      <span>Vidas: {{ lives }}</span>
      <span>Puntuación: {{ score }}</span>
      <span>Vídeos: {{ videosPlayed }}</span>
      <span v-if="DEBUG">FPS: {{ fps }}</span>
    </div>
    <div v-if="showModal" class="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
      <div class="bg-gray-800 p-6 rounded-lg text-center text-white space-y-4">
        <h2 class="text-2xl font-bold">{{ victory ? '¡Victoria!' : 'Game Over' }}</h2>
        <button @click="resetGame" class="mt-2 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">Reiniciar</button>
      </div>
    </div>
    <div
      ref="ytRef"
      :class="['fixed bottom-4 right-4 w-72 rounded-xl shadow-xl overflow-hidden', { hidden: !ytVisible }]"
    ></div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'

const DEBUG = false
const fps = ref(0)
let lastTime = performance.now()

const { playerFrames, enemyFrames, explosionFrames } = useSprites()

const canvasRef = ref(null)
let ctx

const ytRef = ref(null)
const ytVisible = ref(false)
let ytPlayer
let apiLoaded = false

const videoIds = [
  'dQw4w9WgXcQ','9bZkp7q19f0','3JZ4pnNtyxQ','oHg5SJYRHA0','eY52Zsg-KVI',
  'L_jWHffIx5E','04854XqcfCY','J---aiyznGQ','fJ9rUzIMcZQ','2vjPBrBU-TM',
  'KxQZfWkP7K4','xvZqHgFz51I','PLr7lisfomBk','sNPnbI1arSE','Ttz17qjkh2A',
  'Sagg08DrO5U','60ItHLz5WEA','kXYiU_JCYtU','EDYufnQ6bJg','Az-mGR-CehY',
  'SR9EbxbYVFg','JGwWNGJdvx8','3AtDnEC4zak','euCqAq6BRa4','6Dh-RL__uN4',
  'eVTXPUF4Oz4','iIa5wgN6kCY','Kt_tLuszKBA','_Yhyp-_hX2s','tVj0ZTS4WF4'
]

const difficulty = { lives: 3, shotDelay: 350 }

const clamp = (n, a, b) => Math.min(b, Math.max(a, n))
const speedFactor = ref(1)

const baseEnemySpeed = 1
const baseBulletSpeed = 6
const baseDescendInterval = 1000
let enemySpeed = baseEnemySpeed
let bulletSpeed = baseBulletSpeed
let descendInterval = baseDescendInterval
let lastDescend = 0

const player = reactive({ x: 0, y: 0, width: 40, height: 20 })
const bullet = reactive({ x: 0, y: 0, width: 4, height: 10, active: false })
let lastShot = 0
const rows = 5
const cols = 6
const enemySize = { width: 40, height: 30 }
let enemies = reactive([])
let enemyDir = 1

const explosions = reactive([])

const score = ref(0)
const lives = ref(difficulty.lives)
const videosPlayed = ref(0)

const showModal = ref(false)
const victory = ref(false)
let animId

const shootSound = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='
const explosionSound = 'data:audio/wav;base64,UklGRlIAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='
const soundsEnabled = ref(true)
function playSound(src){ if(!soundsEnabled.value) return; new Audio(src).play() }

function updateScale(){
  const canvas = canvasRef.value
  if(!canvas) return
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientWidth * 9 / 16
  speedFactor.value = clamp(canvas.width / 900, 0.8, 2.0)
  enemySpeed = baseEnemySpeed * speedFactor.value
  bulletSpeed = baseBulletSpeed * speedFactor.value
  descendInterval = baseDescendInterval / speedFactor.value
  player.x = canvas.width / 2 - player.width / 2
  player.y = canvas.height - player.height - 10
}

function initEnemies(){
  enemies.splice(0)
  const margin = 50 * speedFactor.value
  let idx = 0
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const x = margin + c*(enemySize.width+20)
      const y = margin + r*(enemySize.height+20)
      enemies.push({
        x, y,
        width: enemySize.width,
        height: enemySize.height,
        alive: true,
        type: r%3,
        videoId: videoIds[idx++]
      })
    }
  }
}

function resetGame(){
  cancelAnimationFrame(animId) // Evitaba freeze por múltiples bucles activos
  score.value = 0
  lives.value = difficulty.lives
  videosPlayed.value = 0
  enemyDir = 1
  showModal.value = false
  victory.value = false
  bullet.active = false
  explosions.splice(0)
  updateScale()
  initEnemies()
  lastDescend = performance.now()
  lastShot = 0
  animId = requestAnimationFrame(gameLoop)
}

function loadYouTubeAPI(){
  return new Promise(resolve =>{
    if(apiLoaded) return resolve()
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    window.onYouTubeIframeAPIReady = () => { apiLoaded = true; resolve() }
    document.body.appendChild(tag)
  })
}

function createPlayer(){
  ytPlayer = new YT.Player(ytRef.value, {
    height: '200', width: '100%', playerVars:{ rel:0, modestbranding:1 }
  })
}

let keys = {}
function keydown(e){
  keys[e.code] = true
  if(e.code==='Space' && !bullet.active && !showModal.value && performance.now()-lastShot>difficulty.shotDelay){
    bullet.x = player.x + player.width/2 - bullet.width/2
    bullet.y = player.y - bullet.height
    bullet.active = true
    playSound(shootSound)
    lastShot = performance.now()
  }
}
function keyup(e){ keys[e.code]=false }

function updatePlayer(){
  const speed = 5 * speedFactor.value
  if(keys['ArrowLeft']||keys['KeyA']) player.x = Math.max(0, player.x - speed)
  if(keys['ArrowRight']||keys['KeyD']) player.x = Math.min(canvasRef.value.width - player.width, player.x + speed)
}

function updateBullet(){
  if(!bullet.active) return
  bullet.y -= bulletSpeed
  if(bullet.y<0) bullet.active=false
}

function updateEnemies(){
  let shift=false
  for(const e of enemies){
    if(!e.alive) continue
    e.x += enemyDir*enemySpeed
    if(e.x + e.width >= canvasRef.value.width - 10 || e.x <= 10) shift=true
  }
  if(shift || performance.now()-lastDescend>descendInterval){
    enemyDir*=-1
    for(const e of enemies){ e.y += 20 * speedFactor.value }
    lastDescend = performance.now()
  }
}

function updateExplosions(now){
  for(let i=explosions.length-1;i>=0;i--){
    const ex=explosions[i]
    const frame=Math.floor((now-ex.start)/60)
    if(frame>=explosionFrames.length){ explosions.splice(i,1) }
    else ex.frame=frame
  }
}

function checkCollisions(){
  if(bullet.active){
    for(const e of enemies){
      if(e.alive && bullet.x<e.x+e.width && bullet.x+bullet.width>e.x && bullet.y<e.y+e.height && bullet.y+bullet.height>e.y){
        const hitPlay = bullet.x < e.x+e.width/2+8 && bullet.x+bullet.width > e.x+e.width/2-8 && bullet.y < e.y+e.height/2+8 && bullet.y+bullet.height > e.y+e.height/2-8
        e.alive=false
        bullet.active=false
        score.value +=10
        explosions.push({x:e.x,y:e.y,start:performance.now(),frame:0})
        playSound(explosionSound)
        if(hitPlay){
          videosPlayed.value++
          if(ytPlayer && e.videoId){
            ytPlayer.loadVideoById(e.videoId)
            ytPlayer.playVideo()
            ytVisible.value=true
          }
        }
        break
      }
    }
  }
  for(const e of enemies){
    if(!e.alive) continue
    if(e.y+e.height>=player.y && e.x<player.x+player.width && e.x+e.width>player.x){
      loseLife(); e.alive=false
    }else if(e.y+e.height>=canvasRef.value.height){ gameOver() }
  }
}

function loseLife(){ lives.value--; if(lives.value<=0) gameOver() }

function gameOver(){ showModal.value=true; cancelAnimationFrame(animId) }

function checkVictory(){
  if(enemies.every(e=>!e.alive)){
    victory.value=true
    showModal.value=true
    cancelAnimationFrame(animId)
  }
}

function draw(now){
  ctx.clearRect(0,0,canvasRef.value.width, canvasRef.value.height)
  const pFrame = playerFrames[bullet.active?1:0]
  ctx.drawImage(pFrame, player.x, player.y, player.width, player.height)
  if(bullet.active){ ctx.fillStyle='#ff0'; ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height) }
  const eFrame = Math.floor(now/300)%2
  for(const e of enemies){
    if(!e.alive) continue
    ctx.drawImage(enemyFrames[e.type][eFrame], e.x, e.y, e.width, e.height)
    ctx.fillStyle='#fff'
    ctx.beginPath()
    const px=e.x+e.width/2-8; const py=e.y+e.height/2-8
    ctx.moveTo(px, py)
    ctx.lineTo(px, py+16)
    ctx.lineTo(px+16, py+8)
    ctx.fill()
  }
  for(const ex of explosions){ ctx.drawImage(explosionFrames[ex.frame], ex.x, ex.y, enemySize.width, enemySize.height) }
}

function gameLoop(now){
  if(DEBUG) console.time('loop')
  updatePlayer()
  updateBullet()
  updateEnemies()
  checkCollisions()
  updateExplosions(now)
  draw(now)
  checkVictory()
  if(DEBUG){ fps.value = Math.round(1000/(now-lastTime)); lastTime=now; console.timeEnd('loop') }
  if(!showModal.value) animId = requestAnimationFrame(gameLoop)
}

onMounted(async ()=>{
  const canvas = canvasRef.value
  ctx = canvas.getContext('2d')
  updateScale()
  initEnemies()
  window.addEventListener('keydown', keydown)
  window.addEventListener('keyup', keyup)
  window.addEventListener('resize', updateScale)
  await loadYouTubeAPI()
  createPlayer()
  animId = requestAnimationFrame(gameLoop)
})

onUnmounted(()=>{
  window.removeEventListener('keydown', keydown)
  window.removeEventListener('keyup', keyup)
  window.removeEventListener('resize', updateScale)
  cancelAnimationFrame(animId)
})

function useSprites(){
  const p1='PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHJlY3QgeD0iNiIgeT0iMCIgd2lkdGg9IjQiIGhlaWdodD0iMiIgZmlsbD0iIzAwZmYwMCIvPjxyZWN0IHg9IjQiIHk9IjIiIHdpZHRoPSI4IiBoZWlnaHQ9IjIiIGZpbGw9IiMwMGZmMDAiLz48cmVjdCB4PSIyIiB5PSI0IiB3aWR0aD0iMTIiIGhlaWdodD0iMiIgZmlsbD0iIzAwZmYwMCIvPjxyZWN0IHg9IjAiIHk9IjYiIHdpZHRoPSIxNiIgaGVpZ2h0PSI0IiBmaWxsPSIjMDBmZjAwIi8+PHJlY3QgeD0iMiIgeT0iMTAiIHdpZHRoPSIxMiIgaGVpZ2h0PSIyIiBmaWxsPSIjMDBmZjAwIi8+PHJlY3QgeD0iNCIgeT0iMTIiIHdpZHRoPSI4IiBoZWlnaHQ9IjIiIGZpbGw9IiMwMGZmMDAiLz48cmVjdCB4PSI2IiB5PSIxNCIgd2lkdGg9IjQiIGhlaWdodD0iMiIgZmlsbD0iIzAwZmYwMCIvPjwvc3ZnPg=='
  const p2='PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHJlY3QgeD0iNiIgeT0iMCIgd2lkdGg9IjQiIGhlaWdodD0iMiIgZmlsbD0iIzAwZmYwMCIvPjxyZWN0IHg9IjQiIHk9IjIiIHdpZHRoPSI4IiBoZWlnaHQ9IjIiIGZpbGw9IiMwMGZmMDAiLz48cmVjdCB4PSIyIiB5PSI0IiB3aWR0aD0iMTIiIGhlaWdodD0iMiIgZmlsbD0iIzAwZmYwMCIvPjxyZWN0IHg9IjAiIHk9IjYiIHdpZHRoPSIxNiIgaGVpZ2h0PSI0IiBmaWxsPSIjMDBjYzAwIi8+PHJlY3QgeD0iMiIgeT0iMTAiIHdpZHRoPSIxMiIgaGVpZ2h0PSIyIiBmaWxsPSIjMDBmZjAwIi8+PHJlY3QgeD0iNCIgeT0iMTIiIHdpZHRoPSI4IiBoZWlnaHQ9IjIiIGZpbGw9IiMwMGZmMDAiLz48cmVjdCB4PSI2IiB5PSIxNCIgd2lkdGg9IjQiIGhlaWdodD0iMiIgZmlsbD0iIzAwZmYwMCIvPjwvc3ZnPg=='

  const e1a='PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHJlY3QgeD0iNCIgeT0iMCIgd2lkdGg9IjgiIGhlaWdodD0iMiIgZmlsbD0iI2ZmMDAwMCIvPjxyZWN0IHg9IjIiIHk9IjIiIHdpZHRoPSIxMiIgaGVpZ2h0PSIyIiBmaWxsPSIjZmYwMDAwIi8+PHJlY3QgeD0iMCIgeT0iNCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZjAwMDAiLz48cmVjdCB4PSIyIiB5PSI4IiB3aWR0aD0iMTIiIGhlaWdodD0iMiIgZmlsbD0iI2ZmMDAwMCIvPjxyZWN0IHg9IjQiIHk9IjEwIiB3aWR0aD0iOCIgaGVpZ2h0PSIyIiBmaWxsPSIjZmYwMDAwIi8+PHJlY3QgeD0iNiIgeT0iMTIiIHdpZHRoPSI0IiBoZWlnaHQ9IjIiIGZpbGw9IiNmZjAwMDAiLz48L3N2Zz4='
  const e1b='PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHJlY3QgeD0iNCIgeT0iMCIgd2lkdGg9IjgiIGhlaWdodD0iMiIgZmlsbD0iI2NjMDAwMCIvPjxyZWN0IHg9IjIiIHk9IjIiIHdpZHRoPSIxMiIgaGVpZ2h0PSIyIiBmaWxsPSIjY2MwMDAwIi8+PHJlY3QgeD0iMCIgeT0iNCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjQiIGZpbGw9IiNjYzAwMDAiLz48cmVjdCB4PSIyIiB5PSI4IiB3aWR0aD0iMTIiIGhlaWdodD0iMiIgZmlsbD0iI2NjMDAwMCIvPjxyZWN0IHg9IjQiIHk9IjEwIiB3aWR0aD0iOCIgaGVpZ2h0PSIyIiBmaWxsPSIjY2MwMDAwIi8+PHJlY3QgeD0iNiIgeT0iMTIiIHdpZHRoPSI0IiBoZWlnaHQ9IjIiIGZpbGw9IiNjYzAwMDAiLz48L3N2Zz4='
  const e2a='PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHJlY3QgeD0iNCIgeT0iMCIgd2lkdGg9IjgiIGhlaWdodD0iMiIgZmlsbD0iIzAwMDBmZiIvPjxyZWN0IHg9IjIiIHk9IjIiIHdpZHRoPSIxMiIgaGVpZ2h0PSIyIiBmaWxsPSIjMDAwMGZmIi8+PHJlY3QgeD0iMCIgeT0iNCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjQiIGZpbGw9IiMwMDAwZmYiLz48cmVjdCB4PSIyIiB5PSI4IiB3aWR0aD0iMTIiIGhlaWdodD0iMiIgZmlsbD0iIzAwMDBmZiIvPjxyZWN0IHg9IjQiIHk9IjEwIiB3aWR0aD0iOCIgaGVpZ2h0PSIyIiBmaWxsPSIjMDAwMGZmIi8+PHJlY3QgeD0iNiIgeT0iMTIiIHdpZHRoPSI0IiBoZWlnaHQ9IjIiIGZpbGw9IiMwMDAwZmYiLz48L3N2Zz4='
  const e2b='PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHJlY3QgeD0iNCIgeT0iMCIgd2lkdGg9IjgiIGhlaWdodD0iMiIgZmlsbD0iIzAwMDBjYyIvPjxyZWN0IHg9IjIiIHk9IjIiIHdpZHRoPSIxMiIgaGVpZ2h0PSIyIiBmaWxsPSIjMDAwMGNjIi8+PHJlY3QgeD0iMCIgeT0iNCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjQiIGZpbGw9IiMwMDAwY2MiLz48cmVjdCB4PSIyIiB5PSI4IiB3aWR0aD0iMTIiIGhlaWdodD0iMiIgZmlsbD0iIzAwMDBjYyIvPjxyZWN0IHg9IjQiIHk9IjEwIiB3aWR0aD0iOCIgaGVpZ2h0PSIyIiBmaWxsPSIjMDAwMGNjIi8+PHJlY3QgeD0iNiIgeT0iMTIiIHdpZHRoPSI0IiBoZWlnaHQ9IjIiIGZpbGw9IiMwMDAwY2MiLz48L3N2Zz4='
  const e3a='PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHJlY3QgeD0iNCIgeT0iMCIgd2lkdGg9IjgiIGhlaWdodD0iMiIgZmlsbD0iI2ZmZmYwMCIvPjxyZWN0IHg9IjIiIHk9IjIiIHdpZHRoPSIxMiIgaGVpZ2h0PSIyIiBmaWxsPSIjZmZmZjAwIi8+PHJlY3QgeD0iMCIgeT0iNCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmZmMDAiLz48cmVjdCB4PSIyIiB5PSI4IiB3aWR0aD0iMTIiIGhlaWdodD0iMiIgZmlsbD0iI2ZmZmYwMCIvPjxyZWN0IHg9IjQiIHk9IjEwIiB3aWR0aD0iOCIgaGVpZ2h0PSIyIiBmaWxsPSIjZmZmZjAwIi8+PHJlY3QgeD0iNiIgeT0iMTIiIHdpZHRoPSI0IiBoZWlnaHQ9IjIiIGZpbGw9IiNmZmZmMDAiLz48L3N2Zz4='
  const e3b='PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHJlY3QgeD0iNCIgeT0iMCIgd2lkdGg9IjgiIGhlaWdodD0iMiIgZmlsbD0iI2NjY2MwMCIvPjxyZWN0IHg9IjIiIHk9IjIiIHdpZHRoPSIxMiIgaGVpZ2h0PSIyIiBmaWxsPSIjY2NjYzAwIi8+PHJlY3QgeD0iMCIgeT0iNCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjQiIGZpbGw9IiNjY2NjMDAiLz48cmVjdCB4PSIyIiB5PSI4IiB3aWR0aD0iMTIiIGhlaWdodD0iMiIgZmlsbD0iI2NjY2MwMCIvPjxyZWN0IHg9IjQiIHk9IjEwIiB3aWR0aD0iOCIgaGVpZ2h0PSIyIiBmaWxsPSIjY2NjYzAwIi8+PHJlY3QgeD0iNiIgeT0iMTIiIHdpZHRoPSI0IiBoZWlnaHQ9IjIiIGZpbGw9IiNjY2NjMDAiLz48L3N2Zz4='
  const exps=[
'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHJlY3QgeD0iNy4wIiB5PSIwIiB3aWR0aD0iMi4wIiBoZWlnaHQ9IjE2IiBmaWxsPSIjZmZjYzAwIi8+PHJlY3QgeD0iMCIgeT0iNy4wIiB3aWR0aD0iMTYiIGhlaWdodD0iMi4wIiBmaWxsPSIjZmZjYzAwIi8+PC9zdmc+','PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHJlY3QgeD0iNi41IiB5PSIwIiB3aWR0aD0iMy4wIiBoZWlnaHQ9IjE2IiBmaWxsPSIjZmZjYzAwIi8+PHJlY3QgeD0iMCIgeT0iNi41IiB3aWR0aD0iMTYiIGhlaWdodD0iMy4wIiBmaWxsPSIjZmZjYzAwIi8+PC9zdmc+','PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHJlY3QgeD0iNi4wIiB5PSIwIiB3aWR0aD0iNC4wIiBoZWlnaHQ9IjE2IiBmaWxsPSIjZmZjYzAwIi8+PHJlY3QgeD0iMCIgeT0iNi4wIiB3aWR0aD0iMTYiIGhlaWdodD0iNC4wIiBmaWxsPSIjZmZjYzAwIi8+PC9zdmc+','PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHJlY3QgeD0iNS41IiB5PSIwIiB3aWR0aD0iNS4wIiBoZWlnaHQ9IjE2IiBmaWxsPSIjZmZjYzAwIi8+PHJlY3QgeD0iMCIgeT0iNS41IiB3aWR0aD0iMTYiIGhlaWdodD0iNS4wIiBmaWxsPSIjZmZjYzAwIi8+PC9zdmc+','PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHJlY3QgeD0iNS4wIiB5PSIwIiB3aWR0aD0iNi4wIiBoZWlnaHQ9IjE2IiBmaWxsPSIjZmZjYzAwIi8+PHJlY3QgeD0iMCIgeT0iNS4wIiB3aWR0aD0iMTYiIGhlaWdodD0iNi4wIiBmaWxsPSIjZmZjYzAwIi8+PC9zdmc+'
  ]
  const toImgs = arr => arr.map(src=>{const i=new Image(); i.src='data:image/svg+xml;base64,'+src; return i})
  return {
    playerFrames: toImgs([p1,p2]),
    enemyFrames: [toImgs([e1a,e1b]), toImgs([e2a,e2b]), toImgs([e3a,e3b])],
    explosionFrames: toImgs(exps)
  }
}
</script>

<style scoped>
canvas { image-rendering: pixelated; }
</style>

/* ➜ Instrucciones de uso
1. Registra el componente en la ruta "/music" de tu router Vue.
2. Edita la lista de IDs de YouTube en el array `videoIds` si deseas cambiar los vídeos.
3. Puedes ajustar velocidad y dificultad modificando `difficulty` y los valores base al inicio del script.
*/

/* ➜ Registro de cambios v2
 - Sprites con animaciones pixel-art y explosiones
 - Velocidad escalable según ancho del canvas
 - Modo DEBUG opcional y limpieza de RAF para evitar bloqueos
 - Refactor a helper `useSprites()`
*/
