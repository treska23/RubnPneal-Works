import Phaser from 'phaser';
import { Player } from '../game/Player';
import { HitBox } from '../game/HitBox'; // ⬅️ nuevo import
import { Enemy } from '../game/Enemy';
import RoundManager from '../game/RoundManager';

//import type { HitData } from '../game/HitBox';

export default class FightScene extends Phaser.Scene {
  private player!: Player; // ← tu clase Player             ★
  private enemy!: Enemy; // ← alias recién creado

  private hitGroup!: Phaser.Physics.Arcade.Group;

  // Música de fondo provisional
  private bgm!: Phaser.Sound.BaseSound;

  // Gráficos para las barras
  private playerHealthBar!: Phaser.GameObjects.Graphics;
  private enemyHealthBar!: Phaser.GameObjects.Graphics;
  private playerHealthText!: Phaser.GameObjects.Text;
  private enemyHealthText!: Phaser.GameObjects.Text;
  private ended = false;
  private canMove = false;

  // Le decimos a TS que enemy tendrá también health, maxHealth y takeDamage()

  constructor() {
    super({ key: 'FightScene' });
  }

  preload(): void {
    // Assets cargados en PreloadScene
  }

  create(): void {
    this.canMove = false;
    this.ended = false;

    // 0️⃣ — Carga animaciones (solo una vez)
    Enemy.createAnimations(this.anims);
    this.createPlayerAnimations();

    // Inicia la banda sonora 8‑bit en bucle
    this.bgm = this.sound.add('bgm', { loop: true, volume: 0.5 });
    this.bgm.play();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bgm.stop();
      RoundManager.stopEnemyAI();
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, RoundManager.stopEnemyAI);

    // 1️⃣ — Fondo y plataformas
    this.add
      .image(400, 300, 'room_bg')
      .setDisplaySize(800, 600)
      .setScrollFactor(0);

    const platforms = this.physics.add.staticGroup();
    platforms.create(400, 568, 'ground').setDisplaySize(800, 64).refreshBody();

    // 3️⃣ — Grupo de hit‐boxes
    this.hitGroup = this.physics.add.group({
      classType: HitBox,
      allowGravity: false,
      runChildUpdate: true, // importante: para que las HitBox actualicen su lógica
    });

    // 4️⃣ — Crear jugador
    this.player = new Player(this, 100, 515, 'player_idle', 0, this.hitGroup);
    this.player.setCollideWorldBounds(true);
    (this.player.body as Phaser.Physics.Arcade.Body).setBounce(0, 0);
    this.physics.add.collider(this.player, platforms);

    // 5️⃣ — Crear enemigo
    this.enemy = new Enemy(
      this,
      650,
      500,
      'detective_idle', // textura inicial
      0, // frame por defecto
      100, // maxHealth (puedes ajustar este número)
      this.player, // → target: el jugador
      this.hitGroup, // → hitGroup: grupo compartido de HitBoxes
    );
    this.enemy.setFlipX(true);

    this.physics.add.collider(this.enemy, platforms);
    RoundManager.startEnemyAI(this.player, this.enemy);

    // 6️⃣ — Overlap: cualquier HitBox del grupo golpea al enemigo
    this.physics.add.overlap(this.hitGroup, this.enemy, (objA, objB) => {
      const hit = objA instanceof HitBox ? (objA as HitBox) : (objB as HitBox);
      const enem = objA === hit ? (objB as Enemy) : (objA as Enemy);

      if (hit.hitData.owner !== 'player') return; // ← filtro
      hit.applyTo(enem);
      this.playHitEffects(hit);
    });

    // 7️⃣ — Overlap: cualquier HitBox del grupo golpea al jugador
    this.physics.add.overlap(this.hitGroup, this.player, (objA, objB) => {
      const hit = objA instanceof HitBox ? (objA as HitBox) : (objB as HitBox);
      const plyr = objA === hit ? (objB as Player) : (objA as Player);

      if (hit.hitData.owner !== 'enemy') return;
      hit.applyTo(plyr);
      this.playHitEffects(hit);
    });

    // 7️⃣ — HUD de vida
    this.playerHealthBar = this.add.graphics();
    this.enemyHealthBar = this.add.graphics();
    this.playerHealthText = this.add.text(20, 20, `${this.player.health}`, {
      fontSize: '14px',
      color: '#ffffff',
    });
    this.enemyHealthText = this.add.text(580, 20, `${this.enemy.health}`, {
      fontSize: '14px',
      color: '#ffffff',
    });
    this.add
      .text(
        400,
        50,
        `Round ${RoundManager.round}  ${RoundManager.playerWins}-${RoundManager.enemyWins}`,
        {
          fontSize: '14px',
          color: '#ffffff',
        },
      )
      .setOrigin(0.5, 0);

    this.drawHealthBar(
      this.playerHealthBar,
      20,
      20,
      this.player.health,
      this.player.maxHealth,
    );
    this.drawHealthBar(
      this.enemyHealthBar,
      580,
      20,
      this.enemy.health,
      this.enemy.maxHealth,
    );

    this.startRoundCountdown();

    this.player.on('healthChanged', (hp: number) => {
      this.drawHealthBar(
        this.playerHealthBar,
        20,
        20,
        hp,
        this.player.maxHealth,
      );
      this.playerHealthText.setText(`${hp}`);
      if (hp <= 0 && !this.ended) {
        this.handleLose();
      }
    });
    this.enemy.on('healthChanged', (hp: number) => {
      this.drawHealthBar(
        this.enemyHealthBar,
        580,
        20,
        hp,
        this.enemy.maxHealth,
      );
      this.enemyHealthText.setText(`${hp}`);
      if (hp <= 0 && !this.ended) {
        this.handleWin();
      }
    });

    // 8️⃣ — Teclas de prueba para el enemigo
    const ATTACK_ANIMS = [
      'enemy_punch',
      'enemy_kick_light',
      'enemy_kick_strong',
    ];

    const keyMap: Record<string, string> = {
      P: 'enemy_idle',
      K: 'enemy_walk',
      V: 'enemy_jump',
      L: 'enemy_punch',
      O: 'enemy_kick_light',
      I: 'enemy_kick_strong',
      H: 'enemy_guard_high',
      J: 'enemy_guard_low',
      U: 'enemy_hit_high',
      Y: 'enemy_hit_low',
      W: 'enemy_ko',
      B: 'enemy_blow',
    };

    this.input.keyboard!.on('keydown', (evt: KeyboardEvent) => {
      const anim = keyMap[evt.key.toUpperCase()];
      if (!anim) return;

      this.enemy.play(anim, true);

      // ── sólo dentro del callback existe “anim” ──
      const isAtk = ATTACK_ANIMS.includes(anim);
      (this.enemy as any).isAttacking = isAtk;

      if (isAtk) {
        this.enemy.once(
          Phaser.Animations.Events.ANIMATION_COMPLETE,
          () => ((this.enemy as any).isAttacking = false),
        );
      }
    });
  }

  private drawHealthBar(
    bar: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    health: number,
    maxHealth: number,
  ) {
    const width = 200;
    const height = 20;
    const pct = Phaser.Math.Clamp(health / maxHealth, 0, 1);

    const color = pct > 0.6 ? 0x00ff00 : pct > 0.3 ? 0xffff00 : 0xff0000;

    bar.clear();
    // fondo
    bar.fillStyle(0x000000);
    bar.fillRect(x - 2, y - 2, width + 4, height + 4);
    // barra color
    bar.fillStyle(color);
    bar.fillRect(x, y, pct * width, height);
  }

  update(time: number, delta: number): void {
    if (!this.canMove) return;
    this.player.update(time, delta);
    (this.enemy as Enemy).update(time, delta);
  }

  private handleWin() {
    this.ended = true;
    this.canMove = false;
    RoundManager.stopEnemyAI();
    this.add
      .text(400, 300, 'You Win', {
        fontSize: '32px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    RoundManager.playerWins += 1;
    const next = () => {
      if (RoundManager.hasPlayerWon()) {
        this.scene.start('VictoryScene');
      } else {
        RoundManager.nextRound();
        this.scene.restart();
      }
    };
    this.time.delayedCall(2000, next);
  }

  private handleLose() {
    this.ended = true;
    this.canMove = false;
    RoundManager.stopEnemyAI();
    this.add
      .text(400, 300, 'You Lose', {
        fontSize: '32px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    RoundManager.enemyWins += 1;
    const next = () => {
      if (RoundManager.hasPlayerLost()) {
        this.scene.start('GameOverScene');
      } else {
        RoundManager.nextRound();
        this.scene.restart();
      }
    };
    this.time.delayedCall(2000, next);
  }

  private playHitEffects(hit: HitBox) {
    this.sound.play('hit_sound');
    const { type, height } = hit.hitData as any;
    if (type === 'kick' || (type === 'punch' && height === 'high')) {
      this.cameras.main.shake(100, 0.01);
    }
  }

  private startRoundCountdown() {
    this.canMove = false;
    const countdown = this.add
      .text(400, 260, '3', {
        fontSize: '32px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    let value = 3;
    const evt = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        value -= 1;
        if (value > 0) {
          countdown.setText(String(value));
        } else {
          evt.remove(false);
          countdown.setText('Fight!');
          this.canMove = true;
          this.time.delayedCall(500, () => countdown.destroy());
        }
      },
    });
  }
  private createPlayerAnimations(): void {
    this.anims.create({
      key: 'player_idle',
      frames: this.anims.generateFrameNumbers('player_idle', {
        start: 0,
        end: 1,
      }),
      frameRate: 2,
      repeat: -1,
    });
    this.anims.create({
      key: 'player_guard_high',
      frames: this.anims.generateFrameNumbers('player_guard_high', {
        start: 0,
        end: 0,
      }),
      frameRate: 2,
      repeat: -1,
    });
    this.anims.create({
      key: 'player_guard_low',
      frames: this.anims.generateFrameNumbers('player_guard_low', {
        start: 0,
        end: 0,
      }),
      frameRate: 2,
      repeat: -1,
    });
    this.anims.create({
      key: 'player_locomotion',
      frames: this.anims.generateFrameNumbers('player_locomotion', {
        start: 0,
        end: 3,
      }),
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: 'player_jump',
      frames: this.anims.generateFrameNumbers('player_jump', {
        start: 0,
        end: 2,
      }),
      frameRate: 8,
      repeat: 0,
    });
    this.anims.create({
      key: 'player_punch',
      frames: this.anims.generateFrameNumbers('player_punch', {
        start: 0,
        end: 1,
      }),
      frameRate: 8,
      repeat: 0,
    });
    this.anims.create({
      key: 'player_kick_light',
      frames: this.anims.generateFrameNumbers('player_kick_soft', {
        start: 0,
        end: 1,
      }),
      frameRate: 8,
      repeat: 0,
    });
    this.anims.create({
      key: 'player_kick_tight',
      frames: this.anims.generateFrameNumbers('player_kick_tight', {
        start: 0,
        end: 1,
      }),
      frameRate: 8,
      repeat: 0,
    });
    this.anims.create({
      key: 'player_damage',
      frames: this.anims.generateFrameNumbers('player_damage', {
        start: 0,
        end: 1,
      }),
      frameRate: 8,
      repeat: 0,
    });
    this.anims.create({
      key: 'player_ko',
      frames: this.anims.generateFrameNumbers('player_ko', {
        start: 0,
        end: 0,
      }),
      frameRate: 8,
      repeat: 0,
    });
    this.anims.create({
      key: 'player_down',
      frames: this.anims.generateFrameNumbers('player_down', {
        start: 0,
        end: 0,
      }),
      frameRate: 8,
      repeat: 0,
    });
  }
}
