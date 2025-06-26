'use client';
import idleSheet from '/public/sprites/avatar-idle.png';
import walkSheet from '/public/sprites/avatar-walk.png';
import { useEffect, useRef, useState } from 'react';

const FRAME_W = 173; // redondeado
const FRAME_H = 377; // fijo
const FRAMES = { idle: 2, walk: 4 } as const;
const SHEET = { idle: idleSheet.src, walk: walkSheet.src } as const;

export default function AvatarGuide() {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<'idle' | 'walk'>('idle');

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    /* ancho y alto de un frame (sólo se ponen 1 vez) */
    el.style.setProperty('--frame-w', FRAME_W + 'px');
    el.style.setProperty('--frame-h', FRAME_H + 'px');

    /* ----------- se actualiza cada vez que cambia `state` ----------- */
    const frames = FRAMES[state];
    el.style.setProperty('--frames', frames.toString());

    /* ahora SÍ ajustamos el tamaño del background a los frames reales */
    el.style.backgroundSize = `${FRAME_W * frames}px ${FRAME_H}px`;

    el.style.backgroundImage = `url(${SHEET[state]})`;
  }, [state]);

  /* cambia sprite y nº de frames */
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    el.style.setProperty('--frames', FRAMES[state].toString());
    el.style.backgroundImage = `url(${SHEET[state]})`;
  }, [state]);

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
