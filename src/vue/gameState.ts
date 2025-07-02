import { reactive, computed } from 'vue';

export interface GameState {
  score: number;
  level: number;
  lives: number;
}

const initialState: GameState = {
  score: 0,
  level: 1,
  lives: 3,
};

const state = reactive<GameState>({ ...initialState });

const hasLives = computed(() => state.lives > 0);
const isGameOver = computed(() => !hasLives.value);

function addScore(amount: number) {
  state.score += amount;
}

function nextLevel() {
  state.level += 1;
}

function loseLife() {
  if (state.lives > 0) {
    state.lives -= 1;
  }
}

function resetGame() {
  Object.assign(state, initialState);
}

export function useGameState() {
  return {
    state,
    hasLives,
    isGameOver,
    addScore,
    nextLevel,
    loseLife,
    resetGame,
  };
}
