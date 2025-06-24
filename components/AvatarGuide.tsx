'use client';
import idleSheet from '@/public/sprites/avatar-idle.png';
import walkSheet from '@/public/sprites/avatar-walk.png';
import { useEffect, useRef, useState } from 'react';

const FRAME_W = walkSheet.width / 6; // 176 px
const FRAME_H = walkSheet.height; // 377 px
const FRAMES = { idle: 2, walk: 6 } as const;
const SHEET = { idle: idleSheet.src, walk: walkSheet.src } as const;

export default function AvatarGuide() {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<'idle' | 'walk'>('idle');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.setProperty('--frame-w', `${FRAME_W}px`);
    el.style.setProperty('--frame-h', `${FRAME_H}px`);
    el.style.setProperty('--frames', String(FRAMES[state]));
    el.style.setProperty('--shift', `calc(var(--frame-w) * -${FRAMES[state]})`);
    el.style.backgroundImage = `url(${SHEET[state]})`;
    el.style.animationName = 'avatar-animate';
    el.style.animationTimingFunction = `steps(${FRAMES[state]})`;
  }, [state]);

  // detecta scroll para cambiar temporalmente a 'walk'
  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;
    const onScroll = () => {
      setState('walk');
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        setState('idle');
        timeout = null;
      }, 600);
    };
    addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (timeout) clearTimeout(timeout);
      removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <figure id="avatar-guide" ref={ref} className="avatar-guide" aria-hidden />
  );
}
