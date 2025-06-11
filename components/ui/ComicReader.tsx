import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin, DefaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import type { ToolbarProps, ToolbarSlot } from '@react-pdf-viewer/toolbar';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { useCallback, useMemo, useRef } from 'react';

export default function ComicReader() {
  const pluginRef = useRef<DefaultLayoutPlugin>();

  const renderToolbar = useCallback(
    (Toolbar: (props: ToolbarProps) => React.ReactElement) => (
      <Toolbar>
        {pluginRef.current?.toolbarPluginInstance.renderDefaultToolbar((slots: ToolbarSlot) => ({
          ...slots,
          Download: () => <></>,
          DownloadMenuItem: () => <></>,
        }))}
      </Toolbar>
    ),
    [],
  );

  const layoutPlugin = useMemo(() => {
    const instance = defaultLayoutPlugin({ renderToolbar });
    pluginRef.current = instance;
    return instance;
  }, [renderToolbar]);

  return (
    <div className="relative left-1/2 -translate-x-1/2 w-[150%] h-screen">
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
