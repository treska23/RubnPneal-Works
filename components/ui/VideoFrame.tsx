export default function VideoFrame({ videoId }: { videoId: string }) {
  return (
    <div className="relative overflow-hidden bg-black rounded-lg shadow-lg crt-effect">
      <iframe
        className="w-full h-56 md:h-64"
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
        frameBorder="0"
        allowFullScreen
      />
      <div className="pointer-events-none absolute inset-0 scanlines"></div>
    </div>
  );
}
