import { useEffect, useRef } from 'react';

export interface MobileControlsProps {
  onDir: (dir: 'left' | 'right' | 'up' | 'down' | 'none') => void;
  onAction: (btn: 'A' | 'B', pressed: boolean) => void;
}

export default function MobileControls({
  onDir,
  onAction,
}: MobileControlsProps) {
  const stickBase = useRef<HTMLDivElement>(null);
  const aBtn = useRef<HTMLButtonElement>(null);
  const bBtn = useRef<HTMLButtonElement>(null);

  const lastDir = useRef<'left' | 'right' | 'up' | 'down' | 'none'>('none');
  const interval = useRef<number | undefined>(undefined);
  const start = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const base = stickBase.current;
    if (!base) return;

    const opt = { passive: false } as AddEventListenerOptions;

    const handleStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      start.current = { x: t.clientX, y: t.clientY };
      interval.current = window.setInterval(() => {
        onDir(lastDir.current);
      }, 50);
    };

    const handleMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - start.current.x;
      const dy = t.clientY - start.current.y;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (ax < 10 && ay < 10) {
        lastDir.current = 'none';
        return;
      }
      if (ax > ay) {
        lastDir.current = dx < 0 ? 'left' : 'right';
      } else {
        lastDir.current = dy < 0 ? 'up' : 'down';
      }
    };

    const end = (e: TouchEvent) => {
      e.preventDefault();
      lastDir.current = 'none';
      onDir('none');
      if (interval.current) window.clearInterval(interval.current);
    };

    base.addEventListener('touchstart', handleStart, opt);
    base.addEventListener('touchmove', handleMove, opt);
    base.addEventListener('touchend', end, opt);
    base.addEventListener('touchcancel', end, opt);

    return () => {
      base.removeEventListener('touchstart', handleStart);
      base.removeEventListener('touchmove', handleMove);
      base.removeEventListener('touchend', end);
      base.removeEventListener('touchcancel', end);
      if (interval.current) window.clearInterval(interval.current);
    };
  }, [onDir]);

  useEffect(() => {
    const a = aBtn.current;
    const b = bBtn.current;
    if (!a || !b) return;
    const opt = { passive: false } as AddEventListenerOptions;

    const startA = (e: TouchEvent) => {
      e.preventDefault();
      onAction('A', true);
    };
    const endA = (e: TouchEvent) => {
      e.preventDefault();
      onAction('A', false);
    };
    const startB = (e: TouchEvent) => {
      e.preventDefault();
      onAction('B', true);
    };
    const endB = (e: TouchEvent) => {
      e.preventDefault();
      onAction('B', false);
    };

    a.addEventListener('touchstart', startA, opt);
    a.addEventListener('touchend', endA, opt);
    a.addEventListener('touchcancel', endA, opt);
    b.addEventListener('touchstart', startB, opt);
    b.addEventListener('touchend', endB, opt);
    b.addEventListener('touchcancel', endB, opt);

    return () => {
      a.removeEventListener('touchstart', startA);
      a.removeEventListener('touchend', endA);
      a.removeEventListener('touchcancel', endA);
      b.removeEventListener('touchstart', startB);
      b.removeEventListener('touchend', endB);
      b.removeEventListener('touchcancel', endB);
    };
  }, [onAction]);

  return (
    <>
      <div ref={stickBase} className="stick-base">
        <div className="stick-knob" />
      </div>
      <button ref={aBtn} className="btn-a">
        A
      </button>
      <button ref={bBtn} className="btn-b">
        B
      </button>
    </>
  );
}
