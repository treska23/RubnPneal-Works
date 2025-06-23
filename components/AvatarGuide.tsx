'use client';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import idleSheet from '@/public/sprites/avatar-idle.png';
import walkSheet from '@/public/sprites/avatar-walk.png';

const FRAME_W = idleSheet.width / 2; // 2 frames en idle (png = 2 columnas)
const FRAME_H = idleSheet.height;
const SHEET = { idle: idleSheet.src, walk: walkSheet.src } as const;
const FRAMES = { idle: 2, walk: 6 } as const;
const ROOT_ID = 'avatar-guide-root';

export default function AvatarGuide() {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<'idle' | 'walk'>('idle');

  // ensure a single guide instance mounted in the page
  useEffect(() => {
    const already = document.getElementById(ROOT_ID);
    if (already) return;
    const div = document.createElement('div');
    div.id = ROOT_ID;
    document.body.appendChild(div);
    createRoot(div).render(<AvatarGuide />);
  }, []);

  const rootExists =
    typeof window !== 'undefined' && document.getElementById(ROOT_ID);

  // inicializa variables de tamaño al montar
  useEffect(() => {
    if (!rootExists || !ref.current) return;
    ref.current.style.setProperty('--frame-w', `${FRAME_W}px`);
    ref.current.style.setProperty('--frame-h', `${FRAME_H}px`);
  }, [rootExists]);

  // aplica animación y sprite en cada cambio de estado
  useEffect(() => {
    if (!rootExists || !ref.current) return;
    const frames = FRAMES[state];
    ref.current.style.setProperty('--frames', String(frames));
    ref.current.style.setProperty('--anim-name', state);
    ref.current.style.backgroundImage = `url(${SHEET[state]})`;
  }, [state, rootExists]);

  // detecta scroll para cambiar temporalmente a 'walk'
  useEffect(() => {
    if (!rootExists) return;
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
  }, [rootExists]);

  if (!rootExists) return null;

  return <figure ref={ref} className="avatar-guide" aria-hidden />;
}
