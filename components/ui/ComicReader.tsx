// components/ui/ComicReader.tsx
'use client'; // ← si usas el router “app”

import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import type { ToolbarSlot } from '@react-pdf-viewer/toolbar';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

import { useMemo } from 'react';

export default function ComicReader() {
  // 1️⃣ instancia del plug-in (solo una vez)
  const defaultLayoutPluginInstance = useMemo(() => defaultLayoutPlugin(), []);

  // 2️⃣ Reference cómodo a la Toolbar ya creada dentro del plug-in
  const { Toolbar } = defaultLayoutPluginInstance.toolbarPluginInstance;

  // 3️⃣ Transforma los slots (quitamos descarga)
  const transform = (slot: ToolbarSlot): ToolbarSlot => ({
    ...slot,
    Download: () => <></>,
    DownloadMenuItem: () => <></>,
  });

  return (
    <div className="flex justify-center">
      <div className="w-[150%] h-screen">
        <Worker workerUrl="/pdf.worker.js">
          <Viewer
            fileUrl="/Cuando%20los%20árboles%20dejaron%20de%20hablar_peq.pdf"
            plugins={[defaultLayoutPluginInstance]}
            defaultScale={SpecialZoomLevel.PageWidth}
          />
        </Worker>

        {/* Toolbar personalizada */}
        <Toolbar>
          {defaultLayoutPluginInstance.toolbarPluginInstance.renderDefaultToolbar(transform)}
        </Toolbar>
      </div>
    </div>
  );
}
