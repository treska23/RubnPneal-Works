// components/ui/GameFighter.tsx
'use client';

import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useRef,
  useState,
} from 'react';
import { qs } from '@/lib/safe-dom';
import RoundManager from 'game-fighter/src/game/RoundManager';
import Phaser from 'phaser';
import MobileControls from '@components/fight/MobileControls';
import { isMobile } from '@/helpers/is-mobile';

import BootScene from 'game-fighter/src/scenes/BootScene';
import PreloadScene from 'game-fighter/src/scenes/PreloadScene';
import FightScene from 'game-fighter/src/scenes/FightScene';
import GameOverScene from 'game-fighter/src/scenes/GameOverScene';
import VictoryScene from 'game-fighter/src/scenes/VictoryScene';

/* --------- interfaz que ComicReader usará --------- */
export interface GameFighterHandle {
  /** Pone el foco en el canvas del juego */
  focus: () => void;
  /** Destruye el juego y limpia recursos */
  destroy: () => void;
}

type Props = {
  onSolved: () => void;
};

/* ==================================================
 *  Componente
 * ================================================== */
const GameFighter = forwardRef<GameFighterHandle, Props>(
  ({ onSolved }, ref) => {
    const container = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const [dir, setDir] = useState<'left' | 'right' | 'up' | 'down' | 'none'>('none');
    const [punch, setPunch] = useState(false);
    const [kick, setKick] = useState(false);
    const [showControls, setShowControls] = useState(false);

    const destroyGame = () => {
      RoundManager.stopEnemyAI();
      gameRef.current?.destroy(true);
    };

    useImperativeHandle(ref, () => ({
      focus() {
        const canvas = qs<HTMLCanvasElement>(container.current, 'canvas');
        canvas?.focus();
      },
      destroy: destroyGame,
    }));

    /* -- montar Phaser una sola vez ------------------ */
    useEffect(() => {
      if (!container.current) return;

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: container.current,
        width: 800,
        height: 600,
        backgroundColor: '#000',
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 980 } } },
        scene: [
          BootScene,
          PreloadScene,
          FightScene,
          GameOverScene,
          VictoryScene,
        ],
      });

      /* Cuando el minijuego emite el evento, avisa a React */
      gameRef.current.events.once('minigameSolved', () => {
        gameRef.current?.scene.getScenes(true).forEach((s) => s.scene.pause());
        onSolved();
      });

      const show = () => setShowControls(isMobile());
      gameRef.current.events.on('show-controls', show);

      /* limpieza segura */
      return () => {
        gameRef.current?.events.off('show-controls', show);
        destroyGame();
      };
    }, [onSolved]);

    const dispatchKey = (code: string, type: 'keydown' | 'keyup') => {
      const evt = new KeyboardEvent(type, { code });
      window.dispatchEvent(evt);
    };

    const lastDir = useRef<'left' | 'right' | 'up' | 'down' | 'none'>('none');
    useEffect(() => {
      const map: Record<typeof dir, string> = {
        left: 'ArrowLeft',
        right: 'ArrowRight',
        up: 'ArrowUp',
        down: 'ArrowDown',
        none: '',
      };
      if (lastDir.current !== 'none') {
        dispatchKey(map[lastDir.current], 'keyup');
      }
      if (dir !== 'none') {
        dispatchKey(map[dir], 'keydown');
      }
      lastDir.current = dir;
    }, [dir]);

    useEffect(() => {
      dispatchKey('KeyA', punch ? 'keydown' : 'keyup');
    }, [punch]);

    useEffect(() => {
      dispatchKey('KeyS', kick ? 'keydown' : 'keyup');
    }, [kick]);

    /* ------------------------------------------------ */
    return (
      <div
        ref={container}
        /* tabIndex permite recibir foco vía keyboard/nav */
        tabIndex={0}
        className="absolute inset-0 z-20 flex items-center justify-center bg-black/75"
      >
        {showControls && (
          <MobileControls
            onDir={(d) => setDir(d)}
            onAction={(btn, down) => {
              if (btn === 'A') setPunch(down);
              if (btn === 'B') setKick(down);
            }}
          />
        )}
      </div>
    );
  },
);

GameFighter.displayName = 'GameFighter';

export default GameFighter;
