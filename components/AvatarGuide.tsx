'use client';
import idleSheet from '@/public/sprites/avatar-idle.png';
import walkSheet from '@/public/sprites/avatar-walk.png';
import { useRef, useEffect, useState } from 'react';

const SHEET = { idle: idleSheet.src, walk: walkSheet.src } as const;
const FRAMES = { idle: 2, walk: 6 } as const;
const ROOT_ID = 'avatar-guide-root';


export default function AvatarGuide() {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<'idle' | 'walk'>('idle');
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

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

  useEffect(() => {
    if (!rootExists || !ref.current) return;
    const el = ref.current;

    const updateStyles = (w: number, h: number) => {
      el.style.setProperty('--frame-w', `${w}px`);
      el.style.setProperty('--frame-h', `${h}px`);
    };

    if (!dims) {
      const img = new Image();
      img.src = idleSheet.src;
      const decode = img.decode ? img.decode() : Promise.reject();
      decode
        .then(() => setDims({ w: img.width / FRAMES.idle, h: img.height }))
        .catch(() => setDims({ w: 176, h: 377 }));
      return;
    }

    updateStyles(dims.w, dims.h);
    const frames = FRAMES[state];
    el.style.setProperty('--frames', String(frames));
    el.style.setProperty('--shift', `calc(var(--frame-w) * -${frames})`);
    el.style.backgroundImage = `url(${SHEET[state]})`;
    el.style.animationName = 'avatar-animate';
  }, [rootExists, state, dims]);


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
