import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin, type DefaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import type { ToolbarSlot } from '@react-pdf-viewer/toolbar';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { useMemo } from 'react';

export default function ComicReader() {
  const layoutPlugin = useMemo(() => {
    const transform = (slot: ToolbarSlot): ToolbarSlot => ({
      ...slot,
      Download: () => <></>,
      DownloadMenuItem: () => <></>,
    });

    const plugin: DefaultLayoutPlugin = defaultLayoutPlugin({
      renderToolbar: (Toolbar) => (
        <Toolbar>{plugin.toolbarPluginInstance.renderDefaultToolbar(transform)}</Toolbar>
      ),
    });

    return plugin;
  }, []);

  return (
    <div className="flex justify-center">
      <div className="w-[150%] h-screen">
        <Worker workerUrl="/pdf.worker.js">
          <Viewer
            fileUrl="/Cuando los árboles dejaron de hablar_peq.pdf"
            plugins={[layoutPlugin]}
            defaultScale={SpecialZoomLevel.PageWidth}
          />
        </Worker>
      </div>
    </div>
  );
}
