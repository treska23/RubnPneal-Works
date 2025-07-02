import { reactive, onMounted, onUnmounted } from 'vue';
import type { LevelMap } from './maze';

export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  vx: number;
  vy: number;
}

export function usePlayer(levelMap: LevelMap, tileSize: number) {
  const state = reactive<PlayerState>({
    x: tileSize,
    y: tileSize,
    width: tileSize * 0.8,
    height: tileSize * 0.8,
    speed: tileSize / 8,
    vx: 0,
    vy: 0,
  });

  const keys: Record<string, boolean> = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  const keyMap: Record<string, keyof typeof keys> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    KeyW: 'up',
    KeyS: 'down',
    KeyA: 'left',
    KeyD: 'right',
  };

  const keydown = (e: KeyboardEvent) => {
    const dir = keyMap[e.code];
    if (dir) keys[dir] = true;
  };

  const keyup = (e: KeyboardEvent) => {
    const dir = keyMap[e.code];
    if (dir) keys[dir] = false;
  };

  const isWall = (x: number, y: number) => {
    const col = Math.floor(x / tileSize);
    const row = Math.floor(y / tileSize);
    return levelMap[row]?.[col] === 1;
  };

  const collides = (x: number, y: number) => {
    const left = x;
    const right = x + state.width - 1;
    const top = y;
    const bottom = y + state.height - 1;
    return (
      isWall(left, top) ||
      isWall(right, top) ||
      isWall(left, bottom) ||
      isWall(right, bottom)
    );
  };

  function update() {
    let vx = 0;
    let vy = 0;
    if (keys.left) vx = -state.speed;
    if (keys.right) vx = state.speed;
    if (keys.up) vy = -state.speed;
    if (keys.down) vy = state.speed;

    const nextX = state.x + vx;
    const nextY = state.y + vy;

    if (!collides(nextX, state.y)) state.x = nextX;
    if (!collides(state.x, nextY)) state.y = nextY;

    state.vx = vx;
    state.vy = vy;
  }

  const setPosition = (x: number, y: number) => {
    state.x = x;
    state.y = y;
  };

  onMounted(() => {
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
  });

  return { state, update, setPosition };
}
