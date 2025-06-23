'use client';
import { useEffect, useState, useRef } from 'react';

const FRAME_W = 176;
const FRAME_H = 377;

const ANIMS = {
  walk: { sheet: '/sprites/avatar-walk.png', frames: 4 },
  idle: { sheet: '/sprites/avatar-idle.png', frames: 2 },
} as const;

export default function AvatarGuide() {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'walk'>('idle');

  /* helper para aplicar CSS vars */
  const apply = (name: 'idle' | 'walk') => {
    const s = ANIMS[name];
    if (!ref.current) return;
    ref.current.style.setProperty('--sheet', `url("${s.sheet}")`);
    ref.current.style.setProperty('--frames', String(s.frames));
  };

  /* inicia y cambia a “walk” durante scroll */
  useEffect(() => {
    apply('idle');

    const onScroll = () => {
      if (state === 'walk') return;
      setState('walk');
      apply('walk');
      const done = () => {
        setState('idle');
        apply('idle');
        window.removeEventListener('scrollend', done);
      };
      window.addEventListener('scrollend', done);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [state]);

  useEffect(() => {
    // evita montajes duplicados
    if (document.getElementById('avatar-guide-root')) return;
    ref.current!.id = 'avatar-guide-root';
  }, []);

  return (
    <div
      ref={ref}
      className="avatar-guide"
      style={{
        '--frames': ANIMS[state].frames,
        '--anim-name': state,
        '--frame-w': `${FRAME_W}px`,
        '--frame-h': `${FRAME_H}px`,
      } as React.CSSProperties}
    />
  );
}
