'use client';
import { useEffect, useRef } from 'react';

const ANIMS = {
  walk: { sheet: '/sprites/avatar-walk.png', frames: 6 },
  idle: { sheet: '/sprites/avatar-idle.png', frames: 4 },
};

export default function AvatarGuide() {
  const ref = useRef<HTMLDivElement>(null);

  /* helper para iniciar animación sprite-sheet via CSS */
  const setAnim = (name: 'walk' | 'idle') => {
    const { sheet, frames } = ANIMS[name];
    ref.current!.style.setProperty('--sheet', `url("${sheet}")`);
    ref.current!.style.setProperty('--frames', String(frames));
    ref.current!.style.setProperty('--anim-name', name);
  };

  useEffect(() => {
    /* On mount: listen scroll & nav clicks */
    if (ref.current) {
      ref.current.style.setProperty('--sheet', `url("${ANIMS.idle.sheet}")`);
    }
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
      className="avatar-guide"
      style={{ '--frames': 4, '--anim-name': 'idle' } as React.CSSProperties}
    />
  );
}
