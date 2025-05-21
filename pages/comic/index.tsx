// pages/index.tsx
import HeroCarousel from "@/components/ui/HeroCarousel";
import SectionLayout from "@/components/SectionLayout";
import AboutAuthor from "@/components/AboutAuthor";

export default function Home() {
  return (
    <>
      <HeroCarousel />

      <SectionLayout title="Sobre el autor">
        <AboutAuthor />
      </SectionLayout>

      {/* Más secciones: Destacados, Footer… */}
    </>
  );
}
