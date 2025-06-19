// components/HeroCarousel.tsx
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import Image from "next/image";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export default function HeroCarousel() {
  const slides = [
    "/hero/slide1.jpg",
    "/hero/slide2.jpg",
    "/hero/slide3.jpg",
    "/hero/slide4.jpg",
  ];

  return (
    <section className="relative w-full h-[70vh] sm:h-screen md:h-[90vh]">
      {/* Carrusel */}
      <Swiper
        modules={[Autoplay, Navigation, Pagination]}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        loop
        className="h-full w-full relative z-0"
      >
        {slides.map((src) => (
          <SwiperSlide key={src}>
            <Image
              src={src}
              alt="Hero slide"
              fill
              priority
              className="object-cover"
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
