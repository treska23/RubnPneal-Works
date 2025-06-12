// components/ui/ComicReader.tsx
'use client';

import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import type { ToolbarSlot } from '@react-pdf-viewer/toolbar';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

import { useMemo, useRef } from 'react';

export default function ComicReader() {
  /* 1️⃣  Crear el plugin SOLO una vez (sin hooks extra)  */
  const pluginRef = useRef(defaultLayoutPlugin());

  /* 2️⃣  Transformar los slots (memorizar para no recrear) */
  const transform = useMemo(
    () =>
      (slot: ToolbarSlot): ToolbarSlot => ({
        ...slot,
        Download: () => <></>,
        DownloadMenuItem: () => <></>,
      }),
    [],
  );
  /* 3️⃣  El visor */
  return (
    <div className="flex justify-center">
      <div className="w-[150%] h-screen relative">
        <Worker workerUrl="/pdf.worker.js">
          <Viewer
            fileUrl="/comic.pdf" /* pon tu nombre sin espacios */
            plugins={[pluginRef.current]}
            defaultScale={SpecialZoomLevel.PageWidth}
          />
        </Worker>

        {/* 4️⃣  Solo pintamos la toolbar cuando ya existe */}
        {pluginRef.current.toolbarPluginInstance && (
          <pluginRef.current.toolbarPluginInstance.Toolbar>
            {pluginRef.current.toolbarPluginInstance.renderDefaultToolbar(transform)}
          </pluginRef.current.toolbarPluginInstance.Toolbar>
        )}
      </div>
    </div>
  );
}
