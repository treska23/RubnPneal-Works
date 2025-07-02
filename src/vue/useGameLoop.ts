import { onMounted, onUnmounted, Ref } from 'vue';
import { drawMaze, type LevelMap } from './maze';
import type { PlayerState } from './usePlayer';
import type { GhostState } from './useGhostAI';

export interface UseGameLoopOptions {
  ctx: Ref<CanvasRenderingContext2D | null>;
  levelMap: LevelMap;
  tileSize: number;
  player: { state: PlayerState; update: () => void };
  ghosts: { ghosts: GhostState[]; moveGhosts: () => void };
  pellets: { handlePelletCollision: (player: PlayerState) => void };
}

export function useGameLoop(options: UseGameLoopOptions) {
  const FPS = 60;
  const FRAME_DURATION = 1000 / FPS;
  let animId = 0;
  let lastTime = 0;

  function loop(time: number) {
    if (time - lastTime >= FRAME_DURATION) {
      lastTime = time;
      const ctx = options.ctx.value;
      if (!ctx) return;
      options.player.update();
      options.ghosts.moveGhosts();
      options.pellets.handlePelletCollision(options.player.state);

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      drawMaze(ctx, options.levelMap);

      ctx.fillStyle = 'yellow';
      ctx.fillRect(options.player.state.x, options.player.state.y, options.player.state.width, options.player.state.height);
      ctx.fillStyle = 'red';
      options.ghosts.ghosts.forEach(g => {
        ctx.fillRect(g.x, g.y, options.tileSize, options.tileSize);
      });
    }
    animId = requestAnimationFrame(loop);
  }

  onMounted(() => {
    animId = requestAnimationFrame(loop);
  });

  onUnmounted(() => {
    cancelAnimationFrame(animId);
  });
}
