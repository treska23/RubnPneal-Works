'use client';
import { useEffect, useRef, useState } from 'react';
import {
  FRAME_W,
  FRAME_H,
  IDLE_FRAMES,
  WALK_FRAMES,
} from '@/lib/avatarDimensions';

export default function AvatarGuide() {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<'idle' | 'walk'>('idle');

  // inicializa variables de tamaño al montar
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.setProperty('--frame-w', `${FRAME_W}px`);
    ref.current.style.setProperty('--frame-h', `${FRAME_H}px`);
  }, []);

  // aplica animación y sprite en cada cambio de estado
  useEffect(() => {
    if (!ref.current) return;
    const frames = state === 'idle' ? IDLE_FRAMES : WALK_FRAMES;
    ref.current.style.setProperty('--frames', String(frames));
    ref.current.style.setProperty('--anim-name', state);
    ref.current.style.backgroundImage = `url('/sprites/avatar-${state}.png')`;
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
