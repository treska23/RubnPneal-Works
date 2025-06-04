import SectionLayout from '@/components/SectionLayout';
import ComicReader from '@/components/ui/ComicReader';

export default function ComicPage() {
  return (
    <SectionLayout title="Cómic" className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-medium text-center mb-8">Sumérgete en mi cuento gráfico…</h1>
      <ComicReader />
    </SectionLayout>
  );
}
