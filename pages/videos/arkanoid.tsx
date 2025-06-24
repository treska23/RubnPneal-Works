// pages/videos/arkanoid.tsx
import dynamic from 'next/dynamic';

const Arkanoid = dynamic(
  () => import('@/components/ui/game-arkanoid/Arkanoid'),
  { ssr: false },
);

export default function ArkanoidPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Arkanoid</h1>
      <Arkanoid isActive={true} videoId="preview" />
    </div>
  );
}
