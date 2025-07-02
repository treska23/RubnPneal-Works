import { ref } from 'vue';
import type { LevelMap } from './maze';
import type { PlayerState } from './usePlayer';
import { useGameState } from './gameState';

export function usePelletManager(levelMap: LevelMap, tileSize: number) {
  const { addScore } = useGameState();

  const pelletsLeft = ref(
    levelMap.reduce((count, row) =>
      count + row.filter((t) => t === 2 || t === 3).length, 0)
  );

  function handlePelletCollision(player: PlayerState, onBigPellet: () => void) {
    const row = Math.floor((player.y + player.height / 2) / tileSize);
    const col = Math.floor((player.x + player.width / 2) / tileSize);
    const tile = levelMap[row]?.[col];
    if (tile === 2 || tile === 3) {
      levelMap[row][col] = 0;
      pelletsLeft.value -= 1;
      addScore(tile === 3 ? 50 : 10);
      if (tile === 3) onBigPellet();
    }
  }

  return { pelletsLeft, handlePelletCollision };
}
