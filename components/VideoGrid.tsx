import dynamic from 'next/dynamic';

const YouTube = dynamic(() => import('react-youtube'), { ssr: false });

interface Props {
  videos: string[];
}

export default function VideoGrid({ videos }: Props) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((id) => (
        <div
          key={id}
          className="w-full overflow-hidden rounded-lg border border-neutral-700"
        >
          {/* 16:9 aspect-ratio wrapper */}
          <div className="relative pb-[56.25%]">
            <YouTube
              videoId={id}
              iframeClassName="absolute inset-0 w-full h-full"
              opts={{ playerVars: { playsinline: 1 } }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
