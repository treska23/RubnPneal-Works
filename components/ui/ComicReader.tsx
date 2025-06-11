import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin, DefaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import type { ToolbarProps, ToolbarSlot } from '@react-pdf-viewer/toolbar';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { useMemo } from 'react';

export default function ComicReader() {
  const layoutPlugin = useMemo(() => {
    // eslint-disable-next-line prefer-const
    let plugin: DefaultLayoutPlugin;
    const renderToolbar = (Toolbar: (props: ToolbarProps) => React.ReactElement) => (
      <Toolbar>
        {plugin.toolbarPluginInstance.renderDefaultToolbar((slots: ToolbarSlot) => ({
          ...slots,
          Download: () => null,
          DownloadMenuItem: () => null,
        }))}
      </Toolbar>
    );
    plugin = defaultLayoutPlugin({ renderToolbar });
    return plugin;
  }, []);

  return (
    <div className="relative mx-auto w-[150%] h-screen">
      <Worker workerUrl="/pdf.worker.js">
        <Viewer
          fileUrl="/Cuando los árboles dejaron de hablar_peq.pdf"
          plugins={[layoutPlugin]}
          defaultScale={SpecialZoomLevel.PageWidth}
        />
      </Worker>
    </div>
  );
}
