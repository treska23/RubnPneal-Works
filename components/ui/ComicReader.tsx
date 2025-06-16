// components/ui/ComicReader.tsx
'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import {
  Worker,
  Viewer,
  SpecialZoomLevel,
  ScrollMode,
  PageChangeEvent,
} from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import type { ToolbarSlot } from '@react-pdf-viewer/toolbar';

import MiniGame from './GameFighter';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

export default function ComicReader() {
  /* ─── plugins ──────────────────────────────────────── */
  const layoutPlugin = useRef(defaultLayoutPlugin());
  const navPlugin = useRef(pageNavigationPlugin());
  const { jumpToPage } = navPlugin.current;

  /* ─── estado ───────────────────────────────────────── */
  const [currentPage, setCurrentPage] = useState(0); // índice 0-based
  const [minigameVisible, setMinigameVisible] = useState(false);
  const [minigameSolved, setMinigameSolved] = useState(false);

  const targetHumanPage = 36;
  const targetIndex = targetHumanPage - 1; // 0-based

  /* ─── toolbar: quitamos descarga ───────────────────── */
  const transform = useMemo(
    () =>
      (slot: ToolbarSlot): ToolbarSlot => ({
        ...slot,
        Download: () => <></>,
        DownloadMenuItem: () => <></>,
      }),
    [],
  );

  /* ─── bloqueo de teclado/rueda mientras hay overlay ── */
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const keysBlocked = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End'];

    const onKey = (e: KeyboardEvent) => {
      if (minigameVisible && keysBlocked.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (minigameVisible) e.preventDefault();
    };

    window.addEventListener('keydown', onKey, true);
    viewerRef.current?.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      window.removeEventListener('keydown', onKey, true);
      viewerRef.current?.removeEventListener('wheel', onWheel);
    };
  }, [minigameVisible]);

  /* ─── cambio de página ─────────────────────────────── */
  const handlePageChange = (e: PageChangeEvent) => {
    const newIdx = e.currentPage;
    // evita avanzar si aún no ganaste
    if (!minigameSolved && newIdx > targetIndex) {
      jumpToPage(targetIndex);
      return;
    }
    setCurrentPage(newIdx);
  };

  /* ─── mostrar u ocultar overlay ─────────────────────── */
  const showMini = currentPage === targetIndex && !minigameSolved;
  useEffect(() => setMinigameVisible(showMini), [showMini]);

  return (
    <div className="relative flex justify-center h-screen">
      {/* ---------- Visor PDF ---------- */}
      <div
        ref={viewerRef}
        className={`w-[150%] h-full ${minigameVisible ? 'pointer-events-none select-none' : ''}`}
      >
        <Worker workerUrl="/pdf.worker.js">
          <Viewer
            fileUrl="/comic.pdf"
            plugins={[layoutPlugin.current, navPlugin.current]}
            defaultScale={SpecialZoomLevel.PageWidth}
            scrollMode={ScrollMode.Page}
            onPageChange={handlePageChange}
          />
        </Worker>

        {layoutPlugin.current.toolbarPluginInstance && (
          <layoutPlugin.current.toolbarPluginInstance.Toolbar>
            {layoutPlugin.current.toolbarPluginInstance.renderDefaultToolbar(transform)}
          </layoutPlugin.current.toolbarPluginInstance.Toolbar>
        )}
      </div>

      {/* ---------- Minijuego ---------- */}
      {showMini && (
        <MiniGame
          onSolved={() => {
            setMinigameSolved(true); // evita que vuelva a aparecer
            setMinigameVisible(false); // reactiva el visor
          }}
        />
      )}
    </div>
  );
}
