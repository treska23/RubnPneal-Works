import { useState } from 'react';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import 'swiper/css';
import 'swiper/css/navigation';

interface ComicPage {
  image: string;
  caption: string;
}

const pages: ComicPage[] = [
  {
    image: '/hero/slide1.jpg',
    caption: 'Primer panel del cuento',
  },
  {
    image: '/hero/slide2.jpg',
    caption: 'Segundo panel del cuento',
  },
  {
    image: '/hero/slide3.jpg',
    caption: 'Tercer panel del cuento',
  },
  {
    image: '/hero/slide4.jpg',
    caption: 'Cuarto panel del cuento',
  },
];

export default function ComicReader() {
  const [mode, setMode] = useState<'vertical' | 'panel'>('vertical');
  const [active, setActive] = useState<number | null>(null);

  const speak = (text: string) => {
    if (typeof window !== 'undefined') {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const Panel = ({ page, index }: { page: ComicPage; index: number }) => (
    <div
      className="relative cursor-pointer overflow-hidden"
      onClick={() => setActive(active === index ? null : index)}
    >
      <TransformWrapper wheel={{ step: 0.2 }} doubleClick={{ disabled: true }}>
        <TransformComponent wrapperClass="w-full h-auto">
          <Image
            src={page.image}
            alt="Comic"
            width={800}
            height={1200}
            className="w-full h-auto select-none"
            draggable={false}
          />
        </TransformComponent>
      </TransformWrapper>
      {active === index && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white p-4 space-y-4">
          <p className="text-center">{page.caption}</p>
          <button
            className="px-4 py-2 bg-white text-black rounded"
            onClick={(e) => {
              e.stopPropagation();
              speak(page.caption);
            }}
          >
            Escuchar
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-2 justify-center">
        <button
          className={`px-4 py-2 rounded ${mode === 'vertical' ? 'bg-black text-white' : 'bg-gray-200'}`}
          onClick={() => setMode('vertical')}
        >
          Vertical
        </button>
        <button
          className={`px-4 py-2 rounded ${mode === 'panel' ? 'bg-black text-white' : 'bg-gray-200'}`}
          onClick={() => setMode('panel')}
        >
          Viñeta por viñeta
        </button>
      </div>

      {mode === 'vertical' ? (
        <div className="space-y-6">
          {pages.map((p, i) => (
            <Panel key={i} page={p} index={i} />
          ))}
        </div>
      ) : (
        <Swiper
          spaceBetween={24}
          className="w-full"
          slidesPerView={1}
          navigation
          modules={[Navigation]}
        >
          {pages.map((p, i) => (
            <SwiperSlide key={i}>
              <Panel page={p} index={i} />
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </div>
  );
}
