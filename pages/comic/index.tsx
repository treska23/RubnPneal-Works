// pages/comic/index.tsx
import SectionLayout from '@/components/SectionLayout';
import dynamic from 'next/dynamic';

// ⬇️  carga diferida en el cliente
const ComicReader = dynamic(() => import('@/components/ui/ComicReader'), {
  ssr: false, // evita que se renderice en el servidor
});

export default function ComicPage() {
  return (
    <SectionLayout title="Cómic">
      <h1 className="text-2xl font-medium text-center mb-8">
        Sumérgete en mi cuento gráfico…
      </h1>

      {/* Visor PDF */}
      <ComicReader />
    </SectionLayout>
  );
}
