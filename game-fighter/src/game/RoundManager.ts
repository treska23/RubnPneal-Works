// game-fighter/src/game/RoundManager.ts
import { requestEnemyAction } from "./EnemyAI";
import { Player } from "./Player";
import { Enemy } from "./Enemy";

export default class RoundManager {
  /* ➊ estado de la partida */
  static playerWins = 0;
  static enemyWins = 0;
  static round = 1;

  /* ➋ id del temporizador de IA */
  private static aiTimer: ReturnType<typeof setInterval> | null = null;

  /* ---------- getters utilitarios ---------- */
  static hasPlayerLost() {
    return this.enemyWins >= 2;
  }
  static hasPlayerWon() {
    return this.playerWins >= 2;
  }

  /* ---------- control de rondas ---------- */
  static reset() {
    this.playerWins = this.enemyWins = 0;
    this.round = 1;
  }
  static nextRound() {
    this.round += 1;
  }

  /* ---------- IA enemigo ---------- */
  static startEnemyAI(player: Player, enemy: Enemy) {
    if (this.aiTimer) return; // ya estaba corriendo
    this.aiTimer = setInterval(async () => {
      const action = await requestEnemyAction({
        distance: Math.abs(player.x - enemy.x),
      });
      enemy.do(action);
    }, 200);
  }

  static stopEnemyAI() {
    if (this.aiTimer) {
      clearInterval(this.aiTimer);
      this.aiTimer = null;
    }
  }
}
