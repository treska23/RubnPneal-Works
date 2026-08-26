'use client';

import {
  ScrollMode,
  SpecialZoomLevel,
  Viewer,
  Worker,
} from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

export default function ComicReader() {
  const layoutPlugin = defaultLayoutPlugin();

  return (
    <div className="h-[82svh] min-h-[620px] w-full bg-[#202020]">
      <Worker workerUrl="/pdf.worker.js">
        <Viewer
          fileUrl="/comic.pdf"
          plugins={[layoutPlugin]}
          defaultScale={SpecialZoomLevel.PageWidth}
          scrollMode={ScrollMode.Page}
        />
      </Worker>
    </div>
  );
}
