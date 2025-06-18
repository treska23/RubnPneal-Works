import { requestEnemyAction } from "./EnemyAI";
import { Player } from "./Player";
import { Enemy } from "./Enemy";

export default class RoundManager {
  static playerWins = 0;
  static enemyWins = 0;
  static round = 1;

  static reset() {
    this.playerWins = 0;
    this.enemyWins = 0;
    this.round = 1;
  }

  static nextRound() {
    this.round += 1;
  }

  /* ---------- IA enemigo ---------- */
  private static aiTimer: ReturnType<typeof setInterval> | null = null;

  static startEnemyAI(player: Player, enemy: Enemy) {
    if (this.aiTimer) return;
    this.aiTimer = setInterval(async () => {
      const action = await requestEnemyAction({
        distance: Math.abs(player.x - enemy.x),
      });
      if (action) enemy.do(action);
    }, 200);
  }

  static stopEnemyAI() {
    if (this.aiTimer !== null) {
      clearInterval(this.aiTimer);
    }
    this.aiTimer = null;
  }

  static hasPlayerLost() {
    return this.enemyWins >= 2;
  }

  static hasPlayerWon() {
    return this.playerWins >= 2;
  }
}
