import { reactive, onMounted, onUnmounted } from 'vue';
import type { LevelMap } from './maze';
import type { PlayerState } from './usePlayer';
import { useGameState } from './gameState';

export interface GhostState {
  x: number;
  y: number;
  color: string;
  speed: number;
  path: { r: number; c: number }[];
}

const BFS_INTERVAL = 500;
const COLORS = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb847'];

export function useGhostAI(levelMap: LevelMap, tileSize: number, player: PlayerState) {
  const { state: game } = useGameState();
  let map = levelMap;

  const baseSpeed = tileSize / 8;
  const ghosts = reactive<GhostState[]>(Array.from({ length: 4 }).map((_, i) => ({
    x: tileSize * (7 + i % 2),
    y: tileSize * (9 + Math.floor(i / 2)),
    color: COLORS[i],
    speed: baseSpeed,
    path: [],
  })));

  let timer: number | undefined;

  const isWalkable = (r: number, c: number) => map[r]?.[c] !== 1;

  function bfs(start: { r: number; c: number }, target: { r: number; c: number }) {
    const q: Array<[number, number]> = [[start.r, start.c]];
    const visited = new Set<string>([`${start.r},${start.c}`]);
    const parent: Record<string, string | null> = {};
    let found = false;
    while (q.length) {
      const [r, c] = q.shift()!;
      if (r === target.r && c === target.c) {
        found = true;
        break;
      }
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        const key = `${nr},${nc}`;
        if (!visited.has(key) && isWalkable(nr, nc)) {
          visited.add(key);
          parent[key] = `${r},${c}`;
          q.push([nr, nc]);
        }
      }
    }

    if (!found) return [] as GhostState['path'];
    const path: GhostState['path'] = [];
    let key = `${target.r},${target.c}`;
    while (key !== `${start.r},${start.c}`) {
      const [pr, pc] = key.split(',').map(Number);
      path.unshift({ r: pr, c: pc });
      key = parent[key]!;
    }
    return path;
  }

  function updatePaths() {
    const tr = Math.floor(player.y / tileSize);
    const tc = Math.floor(player.x / tileSize);
    ghosts.forEach((g) => {
      const sr = Math.floor(g.y / tileSize);
      const sc = Math.floor(g.x / tileSize);
      g.path = bfs({ r: sr, c: sc }, { r: tr, c: tc });
    });
  }

  function moveGhosts() {
    const speedFactor = 1 + (game.level - 1) * 0.1;
    ghosts.forEach((g) => {
      g.speed = baseSpeed * speedFactor;
      if (!g.path.length) return;
      const next = g.path[0];
      const tx = next.c * tileSize;
      const ty = next.r * tileSize;
      const dx = tx - g.x;
      const dy = ty - g.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= g.speed) {
        g.x = tx;
        g.y = ty;
        g.path.shift();
      } else {
        g.x += Math.sign(dx) * g.speed;
        g.y += Math.sign(dy) * g.speed;
      }
    });
  }

  function collidesWithPlayer() {
    return ghosts.some((g) => {
      const gx = g.x + tileSize * 0.4;
      const gy = g.y + tileSize * 0.4;
      const px = player.x + player.width / 2;
      const py = player.y + player.height / 2;
      const d = Math.hypot(gx - px, gy - py);
      return d < tileSize * 0.5;
    });
  }

  onMounted(() => {
    updatePaths();
    timer = window.setInterval(updatePaths, BFS_INTERVAL);
  });

  onUnmounted(() => {
    if (timer) window.clearInterval(timer);
  });

  function reset(newMap: LevelMap) {
    map = newMap;
    ghosts.forEach((g, i) => {
      g.x = tileSize * (7 + (i % 2));
      g.y = tileSize * (9 + Math.floor(i / 2));
      g.path = [];
    });
    updatePaths();
  }

  return { ghosts, moveGhosts, collidesWithPlayer, reset };
}
