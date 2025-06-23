// game-fighter/src/scenes/PreloadScene.ts
import Phaser from 'phaser';
import RoundManager from '../game/RoundManager';
import {
  loadSharedAssets,
  createSharedAnimations,
} from '../utils/SharedLoader';

/* Helper – mapea a /public/game-fighter/... */
const asset = (f: string) => `/game-fighter/${f}`;

export default class PreloadScene extends Phaser.Scene {
  private ready = false;

  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // ╔═════════════ AUDIO ═════════════╗j
    this.tryLoadAudio('bgm', ['audio/bgm.ogg', 'audio/bgm.mp3']);
    this.tryLoadAudio('hit_sound', ['audio/hit.ogg', 'audio/hit.mp3']);
    this.tryLoadAudio('coin_sound', ['audio/coin.wav']); // ahora protegido

    loadSharedAssets(this);

    // ╔═════════════ PLAYER (48×48) ═════════════╗
    const P = 'assets/young/';
    const p = (name: string, file = name.replace('player_', 'young_')) =>
      this.tryLoadSprite(name, `${P}${file}.png`, 48, 48);
    [
      'idle',
      'locomotion',
      'jump',
      'punch',
      'kick_soft',
      'kick_tight',
      'guard_high',
      'guard_low',
      'damage',
      'down',
    ].forEach((action) => p(`player_${action}`));

    this.tryLoadSprite('player_ko', `${P}young_ko.png`, 64, 48); // por ejemplo: 64 de ancho

    /* ╔═════════════ DETECTIVE / ENEMY (48×64) ═════════════╗ */
    const D = 'assets/detective/';
    const d = (key: string, file: string) =>
      this.load.spritesheet(
        key, // ← key usado en las animaciones
        asset(`${D}${file}.png`), // ← archivo existente
        { frameWidth: 48, frameHeight: 64 },
      );

    d('detective_idle', 'detective_idle'); // enemy_idle
    d('detective_locomotion', 'detective_locomotion'); // enemy_walk
    d('detective_punch_right', 'detective_punch'); // enemy_punch
    d('detective_kicks_light', 'detective_kicks_light'); // enemy_kick_light
    d('detective_kicks_tight', 'detective_kicks_tight'); // enemy_kick_strong / jump_kick
    d('detective_damage', 'detective_damage'); // enemy_hit_high
    d('detective_defense', 'detective_defense'); // enemy_guard_high / low  ✅ NUEVO
    d('detective_down', 'detective_down'); // enemy_down / crouch
    d('detective_ko', 'detective_ko'); // enemy_ko

    /* ╔═════════════ BACKGROUND ═════════════╗ */
    this.load.image('room_bg', asset('assets/ground/room_background.png'));
    this.load.image('ground', asset('assets/ground/dirty_floor.png'));

    /* ╔═════════════ UI de carga ═════════════╗ */
    this.cameras.main.setBackgroundColor('#333');
    this.add
      .text(400, 220, 'Gana el combate para seguir leyendo', {
        color: '#fff',
        fontSize: '16px',
      })
      .setOrigin(0.5);

    const bar = this.add.graphics();
    this.load.on('progress', (p: number) =>
      bar
        .clear()
        .fillStyle(0xffffff)
        .fillRect(100, 260, 600 * p, 40),
    );
    this.load.once('complete', () => (this.ready = true));
  }

  create() {
    RoundManager.reset();
    createSharedAnimations(this);

    const prompt = this.add
      .text(400, 320, 'Pulsa para empezar', {
        color: '#ffd700',
        fontSize: '18px',
        backgroundColor: '#000',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive();

    this.input.once('pointerdown', () => {
      /* Desbloqueo de Web-Audio */
      const ctx = (this.sound as any).context;
      if (ctx && ctx.state === 'suspended') ctx.resume();

      const launch = () => this.scene.start('FightScene');
      this.ready ? launch() : this.load.once('complete', launch);
    });
  }
  // ──────────────────────────────────────────────
  // Métodos auxiliares para robustez
  // ──────────────────────────────────────────────

  private tryLoadAudio(key: string, files: string[]) {
    try {
      this.load.audio(
        key,
        files.map((f) => asset(f)),
      );
    } catch (err) {
      console.warn(`⚠️ No se pudo cargar audio ${key}:`, err);
    }
  }

  private tryLoadSprite(
    key: string,
    path: string,
    frameWidth: number,
    frameHeight: number,
  ) {
    try {
      this.load.spritesheet(key, asset(path), { frameWidth, frameHeight });
    } catch (err) {
      console.warn(`⚠️ No se pudo cargar spritesheet "${key}" desde ${path}`);
    }
  }
}
