import dynamic from 'next/dynamic';

const YouTube = dynamic(() => import('react-youtube'), { ssr: false });

interface Props {
  videos: string[];
}

export default function VideoGrid({ videos }: Props) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((id) => (
        <div
          key={id}
          className="relative aspect-video w-full overflow-hidden rounded-lg border border-neutral-700"
        >
          <YouTube
            videoId={id}
            className="absolute inset-0 w-full h-full"
            iframeClassName="w-full h-full"
            opts={{
              width: '100%',
              height: '100%',
              playerVars: { playsinline: 1 },
            }}
          />
        </div>
      ))}
    </div>
  );
}
