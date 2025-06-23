'use client';
import { useEffect, useState, useRef } from 'react';

const SPRITES = {
  idle: { url: '/sprites/avatar-idle.png', frames: 4, fps: 6, w: 32, h: 32 },
  walk: { url: '/sprites/avatar-walk.png', frames: 6, fps: 8, w: 32, h: 32 },
};

export default function AvatarGuide() {
  const ref = useRef<HTMLDivElement>(null);
  const [anim, setAnim] = useState<'idle' | 'walk'>('idle');

  /* helper para aplicar CSS vars */
  const apply = (name: 'idle' | 'walk') => {
    const s = SPRITES[name];
    if (!ref.current) return;
    ref.current.style.setProperty('--sheet', `url("${s.url}")`);
    ref.current.style.setProperty('--frames', String(s.frames));
    ref.current.style.setProperty('--w', `${s.w}px`);
    ref.current.style.setProperty('--h', `${s.h}px`);
    ref.current.style.setProperty('--dur', `${s.frames / s.fps}s`);
  };

  /* inicia y cambia a “walk” durante scroll */
  useEffect(() => {
    apply('idle');

    const onScroll = () => {
      if (anim === 'walk') return;
      setAnim('walk');
      apply('walk');
      const done = () => {
        setAnim('idle');
        apply('idle');
        window.removeEventListener('scrollend', done);
      };
      window.addEventListener('scrollend', done);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [anim]);

  return (
    <div
      ref={ref}
      className="
        fixed bottom-4 right-4 z-[9999] pointer-events-none
        w-[var(--w)] h-[var(--h)]
        [background-image:var(--sheet)]
        bg-left/cover
        animate-avatar
        scale-[3] md:scale-150 lg:scale-200
      "
    />
  );
}
