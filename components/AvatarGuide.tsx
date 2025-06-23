'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

const ANIMS = {
  walk: { sheet: '/sprites/avatar-walk.png', frames: 6 },
  idle: { sheet: '/sprites/avatar-idle.png', frames: 4 },
};

export default function AvatarGuide() {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'walk' | 'idle'>('idle');

  /* helper para iniciar animación sprite-sheet via CSS */
  const setAnim = (name: 'walk' | 'idle') => {
    const { frames } = ANIMS[name];
    ref.current!.style.setProperty('--frames', String(frames));
    ref.current!.style.setProperty('--anim-name', name);
    setState(name);
  };

  useEffect(() => {
    /* On mount: listen scroll & nav clicks */
    const scroll = () => {
      /* calcula sección más visible, mueve avatar */
    };
    window.addEventListener('scroll', scroll, { passive: true });

    /* nav links */
    document.querySelectorAll("nav a[href^='#']").forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLAnchorElement).hash.slice(1);
        const target = document.getElementById(id);
        if (!target) return;
        /* caminar */
        setAnim('walk');
        const y = target.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: y - 64, behavior: 'smooth' });
        /* cuando termina scroll */
        const done = () => {
          setAnim('idle');
          window.removeEventListener('scrollend', done);
        };
        window.addEventListener('scrollend', done);
      });
    });

    return () => window.removeEventListener('scroll', scroll);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="fixed left-4 bottom-4 z-[9999] w-12 h-12 pointer-events-none
                 bg-[image:var(--sheet,url('/sprites/avatar-idle.png'))]
                 animate-[var(--anim-name,idle)_steps(var(--frames))_0.8s_infinite]"
      style={{ '--frames': 4, '--anim-name': 'idle' } as any}
    />
  );
}
