'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DocumentLoadEvent,
  PageChangeEvent,
  ScrollMode,
  SpecialZoomLevel,
  Viewer,
  Worker,
} from '@react-pdf-viewer/core';
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline';

import '@react-pdf-viewer/core/lib/styles/index.css';
import styles from './ComicReader.module.css';

export default function ComicReader() {
  const readerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(105);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === readerRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await readerRef.current?.requestFullscreen();
  };

  const handleDocumentLoad = (event: DocumentLoadEvent) => {
    setTotalPages(event.doc.numPages);
  };

  const handlePageChange = (event: PageChangeEvent) => {
    setCurrentPage(event.currentPage);
  };

  return (
    <div ref={readerRef} className={styles.stage}>
      <section className={styles.frame} aria-label="Lector del cómic">
        <header className={styles.toolbar}>
          <div className={styles.status}>
            <span className={styles.label}>Lectura</span>
            <span aria-live="polite">
              {currentPage + 1} / {totalPages}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className={styles.fullscreen}
            aria-label={
              isFullscreen
                ? 'Salir de pantalla completa'
                : 'Ver el cómic a pantalla completa'
            }
            title={
              isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'
            }
          >
            {isFullscreen ? (
              <ArrowsPointingInIcon aria-hidden="true" />
            ) : (
              <ArrowsPointingOutIcon aria-hidden="true" />
            )}
          </button>
        </header>

        <div className={styles.viewer}>
          <Worker workerUrl="/pdf.worker.js">
            <Viewer
              fileUrl="/comic-web.pdf"
              transformGetDocumentParams={(options) =>
                ({ ...options, isEvalSupported: false }) as typeof options
              }
              defaultScale={SpecialZoomLevel.PageFit}
              scrollMode={ScrollMode.Vertical}
              onDocumentLoad={handleDocumentLoad}
              onPageChange={handlePageChange}
              renderLoader={(percentage) => (
                <div className={styles.loading} role="status">
                  <span>Cargando cómic</span>
                  <div aria-hidden="true">
                    <span style={{ width: `${Math.round(percentage)}%` }} />
                  </div>
                  <small>{Math.round(percentage)}%</small>
                </div>
              )}
              renderError={() => (
                <p className={styles.error} role="alert">
                  No se ha podido cargar el cómic.
                </p>
              )}
            />
          </Worker>
        </div>
      </section>
    </div>
  );
}
