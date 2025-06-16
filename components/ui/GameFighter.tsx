// components/ui/GameFighter.tsx
'use client';
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

import BootScene from 'game-fighter/src/scenes/BootScene';
import PreloadScene from 'game-fighter/src/scenes/PreloadScene';
import FightScene from 'game-fighter/src/scenes/FightScene';
import GameOverScene from 'game-fighter/src/scenes/GameOverScene';
import VictoryScene from 'game-fighter/src/scenes/VictoryScene';

type Props = { onSolved: () => void };

export default function GameFighter({ onSolved }: Props) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container.current,
      width: 800,
      height: 600,
      backgroundColor: '#000',
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 980 } } },
      scene: [BootScene, PreloadScene, FightScene, GameOverScene, VictoryScene],
    });

    /* ── 1)  Gana: pausa escenas y avisa a React ────────────────── */
    game.events.once('minigameSolved', () => {
      game.scene.getScenes(true).forEach((s) => s.scene.pause());
      onSolved();
    });

    /* ── 2)  Limpieza segura ────────────────────────────────────── */
    return () => {
      setTimeout(() => {
        if (game && typeof game.destroy === 'function') {
          game.destroy(true);
        }
      }, 0); // defer: evita el TypeError
    };
  }, [onSolved]);

  return (
    <div
      ref={container}
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/75"
    />
  );
}
