// pages/index.tsx

import type { GetStaticProps, NextPage } from "next";

import HeroCarousel from "../components/ui/HeroCarousel";
import BigTitle from "@/components/BigTitle";
import AboutAuthor from "../components/AboutAuthor";
import SectionLayout from "../components/SectionLayout";
import FeaturedGrid, { FeaturedItem } from "../components/FeaturedGrid";

interface HomeProps {
  featuredItems: FeaturedItem[];
}

// 1) Solo define los datos DENTRO de getStaticProps (o los traes de un API/JSON ahí)
// 2) No hace falta la constante global más abajo
export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const featuredItems: FeaturedItem[] = [
    {
      id: 1,
      imageSrc: "/posts/post1.jpg",
      title: "Proyecto Personal #1",
      description: "Una breve descripción de lo que trata este proyecto.",
      link: "/posts/1",
    },
    {
      id: 2,
      imageSrc: "/posts/post2.jpg",
      title: "Proyecto Personal #2",
      description: "Otra descripción para el segundo proyecto destacado.",
      link: "/posts/2",
    },
    // … más items si necesitas
  ];

  return {
    props: { featuredItems },
  };
};

// 3) Home está tipado como NextPage<HomeProps> y recibe { featuredItems } como prop
const Home: NextPage<HomeProps> = ({ featuredItems }) => {
  return (
    <>
      <HeroCarousel />
      <BigTitle />

      <SectionLayout id="destacados" className="py-8">
        <h2 className="text-8xl font-semibold mb-15 text-center">Destacados</h2>
        <FeaturedGrid items={featuredItems} />
      </SectionLayout>

      <SectionLayout id="about" className="py-16">
        <AboutAuthor />
      </SectionLayout>
    </>
  );
};

export default Home;
