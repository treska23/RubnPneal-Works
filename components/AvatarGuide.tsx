'use client';
import idleSheet from '@/public/sprites/avatar-idle.png';
import walkSheet from '@/public/sprites/avatar-walk.png';
import { useRef, useEffect, useState } from 'react';

// AvatarGuide.tsx (principio)
const IDLE_W = idleSheet.width / 2; // 2 columnas → 384 px
const IDLE_H = idleSheet.height; // 377 px
const WALK_W = walkSheet.width / 6; // 6 columnas → 176 px
const WALK_H = walkSheet.height; // 377 px
const FRAMES = { idle: 2, walk: 6 };

const SHEET: Record<'idle' | 'walk', string> = {
  idle: idleSheet.src,
  walk: walkSheet.src,
};

export default function AvatarGuide() {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<'idle' | 'walk'>('idle');

  // inicializa variables de tamaño al montar
  useEffect(() => {
    if (!ref.current) return;

    // datos según sprite
    const w = state === 'idle' ? IDLE_W : WALK_W;
    const h = state === 'idle' ? IDLE_H : WALK_H;
    const frames = state === 'idle' ? FRAMES.idle : FRAMES.walk;

    // ← propiedades CSS
    ref.current.style.setProperty('--frame-w', `${w}px`);
    ref.current.style.setProperty('--frame-h', `${h}px`);
    ref.current.style.setProperty('--frames', String(frames));
    ref.current.style.setProperty('--shift', `${-w * (frames - 1)}px`);
    ref.current.style.setProperty('--anim-name', state);
    ref.current.style.backgroundImage = `url('${SHEET[state]}')`;
  }, [state]);

  // detecta scroll para cambiar temporalmente a 'walk'
  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;
    const onScroll = () => {
      setState('walk');
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => setState('idle'), 400);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  return <figure ref={ref} className="avatar-guide" aria-hidden />;
}
