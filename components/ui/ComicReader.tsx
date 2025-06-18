// components/ui/ComicReader.tsx
"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import {
  Worker,
  Viewer,
  SpecialZoomLevel,
  ScrollMode,
  PageChangeEvent,
} from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";
import type { ToolbarSlot } from "@react-pdf-viewer/toolbar";
import MiniGame, { GameFighterHandle } from "./GameFighter";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

export default function ComicReader() {
  /* ─── plugins ─────────────────────────────────────────────────── */
  const layoutPlugin = useRef(defaultLayoutPlugin());
  const navPlugin = useRef(pageNavigationPlugin());

  const { jumpToPage } = navPlugin.current;

  /* ─── estado ──────────────────────────────────────────────────── */
  const [currentPage, setCurrentPage] = useState(0);
  const [minigameVisible, setMinigameVisible] = useState(false);
  const [minigameSolved, setMinigameSolved] = useState(false);

  const targetHumanPage = 36;
  const targetIndex = targetHumanPage - 1; // 0-based

  /* ─── toolbar sin descarga ────────────────────────────────────── */
  const transform = useMemo(
    () =>
      (slot: ToolbarSlot): ToolbarSlot => ({
        ...slot,
        Download: () => <></>,
        DownloadMenuItem: () => <></>,
      }),
    [],
  );

  /* ─── freeze-scroll helpers ───────────────────────────────────── */
  const lockScroll = () => {
    const y = window.scrollY;
    document.body.dataset.scrollY = String(y);
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.width = "100%";
  };
  const unlockScroll = () => {
    const y = +(document.body.dataset.scrollY || 0);
    document.body.style.overflow =
      document.body.style.position =
      document.body.style.top =
      document.body.style.width =
        "";
    window.scrollTo(0, y);
  };

  /* ─── show/hide minigame ──────────────────────────────────────── */
  useEffect(() => {
    setMinigameVisible(currentPage === targetIndex && !minigameSolved);
  }, [currentPage, minigameSolved, targetIndex]);

  /* ─── restore page after minigame ─────────────────────────────── */
  useEffect(() => {
    if (!minigameVisible) jumpToPage(currentPage);
  }, [minigameVisible, currentPage, jumpToPage]);


  useEffect(() => {
    if (minigameVisible) lockScroll();
    else unlockScroll();
    return unlockScroll; // limpieza por si el componente desmonta
  }, [minigameVisible]);

  /* ─── page-change “protegido” ─────────────────────────────────── */
  const handlePageChange = (e: PageChangeEvent) => {
    const newIdx = e.currentPage;
    if (!minigameSolved && newIdx > targetIndex) {
      jumpToPage(targetIndex);
      return;
    }
    setCurrentPage(newIdx);
  };

  /* ─── foco al canvas cuando se abre el juego ──────────────────── */
  const miniRef = useRef<GameFighterHandle>(null);
  useEffect(() => {
    if (minigameVisible) setTimeout(() => miniRef.current?.focus(), 0);
  }, [minigameVisible]);

  /* ─────────────────────────── render ──────────────────────────── */
  return (
    <div className="relative flex justify-center h-screen">
      {/* ===== Visor PDF (se desmonta mientras showMini) ===== */}
      {!minigameVisible && (
        <div className="w-[150%] h-full">
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
              {layoutPlugin.current.toolbarPluginInstance.renderDefaultToolbar(
                transform,
              )}
            </layoutPlugin.current.toolbarPluginInstance.Toolbar>
          )}
        </div>
      )}

      {/* ===== Minijuego ===== */}
      {minigameVisible && (
        <MiniGame
          ref={miniRef}
          onSolved={() => {
            setMinigameSolved(true);
            setCurrentPage(targetIndex);
            setMinigameVisible(false); // ← al cerrarlo, PDF se monta de nuevo
          }}
        />
      )}
    </div>
  );
}
