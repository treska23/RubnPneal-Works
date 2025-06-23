import Link from 'next/link';

export default function MusicIndex() {
  return (
    <div className="flex h-screen">
      {/* Mitad Spotify */}
      <Link
        href="/music/spotify"
        className="
          flex-1 flex items-center justify-center
          bg-green-600 hover:bg-green-700
          transition-colors duration-300
          cursor-pointer
        "
      >
        <h1 className="text-5xl font-bold uppercase text-white tracking-wider">
          Spotify
        </h1>
      </Link>

      {/* Mitad YouTube */}
      <Link
        href="/music/youtube"
        className="
          flex-1 flex items-center justify-center
          bg-red-600 hover:bg-red-700
          transition-colors duration-300
          cursor-pointer
        "
      >
        <h1 className="text-5xl font-bold uppercase text-white tracking-wider">
          YouTube
        </h1>
      </Link>
    </div>
  );
}
