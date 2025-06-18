import Phaser from "phaser";
import RoundManager from "../game/RoundManager";

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameOverScene" });
  }

  create() {
    this.sound.stopAll();

    if (this.cache.audio.exists("coin_sound")) {
      this.sound.play("coin_sound");
    } else {
      console.warn("coin_sound sigue sin estar en caché");
    }

    this.cameras.main.setBackgroundColor("#222");
    this.add
      .text(400, 300, "Game Over", {
        color: "#ffffff",
        fontSize: "16px",
      })
      .setOrigin(0.5);
    this.add
      .text(
        400,
        340,
        `Rounds: ${RoundManager.playerWins}-${RoundManager.enemyWins}`,
        {
          color: "#ffffff",
          fontSize: "14px",
        },
      )
      .setOrigin(0.5);
  }
}
