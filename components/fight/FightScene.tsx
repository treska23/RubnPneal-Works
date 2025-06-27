'use client';

import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { qs } from '@/lib/safe-dom';
import MobileControls from './MobileControls';
import { isMobile } from '@/helpers/mobile';
import Phaser from 'phaser';
import BootScene from 'game-fighter/src/scenes/BootScene';
import PreloadScene from 'game-fighter/src/scenes/PreloadScene';
import FightScenePhaser from 'game-fighter/src/scenes/FightScene';
import GameOverScene from 'game-fighter/src/scenes/GameOverScene';
import VictoryScene from 'game-fighter/src/scenes/VictoryScene';
import RoundManager from 'game-fighter/src/game/RoundManager';

interface Props {
  onSolved: () => void;
}

export interface FightSceneHandle {
  focus: () => void;
  destroy: () => void;
}

const FightScene = forwardRef<FightSceneHandle, Props>(({ onSolved }, ref) => {
  const container = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const cleanupRef = useRef<() => void>();
  const [dir, setDir] = useState<'left' | 'right' | 'up' | 'down' | 'none'>('none');
  const [punch, setPunch] = useState(false);
  const [kick, setKick] = useState(false);

  useEffect(() => {
    if (!container.current) return;

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container.current,
      width: 800,
      height: 600,
      backgroundColor: '#000',
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 980 } } },
      scene: [BootScene, PreloadScene, FightScenePhaser, GameOverScene, VictoryScene],
    });

    gameRef.current.events.once('minigameSolved', () => {
      gameRef.current?.scene.getScenes(true).forEach((s) => s.scene.pause());
      onSolved();
    });

    const canvas = container.current.querySelector('canvas');
    const prevent = (e: Event) => e.preventDefault();
    const opt = { passive: false } as AddEventListenerOptions;
    canvas?.addEventListener('touchstart', prevent, opt);
    canvas?.addEventListener('touchmove', prevent, opt);

    cleanupRef.current = () => {
      canvas?.removeEventListener('touchstart', prevent);
      canvas?.removeEventListener('touchmove', prevent);
      RoundManager.stopEnemyAI();
      gameRef.current?.destroy(true);
    };

    return cleanupRef.current;
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

  useImperativeHandle(ref, () => ({
    focus() {
      const canvas = qs<HTMLCanvasElement>(container.current, 'canvas');
      canvas?.focus();
    },
    destroy() {
      cleanupRef.current?.();
    },
  }));

  const mobile = isMobile();

  return (
    <div ref={container} className="relative w-full h-full">
      {mobile && (
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
});

FightScene.displayName = 'FightScene';

export default FightScene;
