'use client';
import idleSheet from '@/public/sprites/avatar-idle.png';
import walkSheet from '@/public/sprites/avatar-walk.png';
import { useRef, useEffect, useState } from 'react';

const FRAME_W = walkSheet.width / 6; // 176 px
const FRAME_H = walkSheet.height; // 377 px
const FRAMES = { idle: 2, walk: 6 } as const;
const SHEET = { idle: idleSheet.src, walk: walkSheet.src } as const;

export default function AvatarGuide() {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<'idle' | 'walk'>('idle');

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const frames = FRAMES[state];
    el.style.setProperty('--frame-w', `${FRAME_W}px`);
    el.style.setProperty('--frame-h', `${FRAME_H}px`);
    el.style.setProperty('--frames', String(frames));
    el.style.backgroundImage = `url(${SHEET[state]})`;
  }, [state]);

  // detecta scroll para cambiar temporalmente a 'walk'
  useEffect(() => {
    let t: NodeJS.Timeout;
    const onScroll = () => {
      setState('walk');
      clearTimeout(t);
      t = setTimeout(() => setState('idle'), 600);
    };
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  return <figure ref={ref} className="avatar-guide" aria-hidden />;
}
