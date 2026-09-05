import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';

export default function AboutAuthor() {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(280px,0.8fr)_1.2fr] lg:gap-20">
      <div className="relative aspect-[4/5] overflow-hidden bg-black/5">
        <Image
          src="/ruben-pneal-autor.webp"
          alt="Retrato de Rubn Pneal, desarrollador de software y artista"
          fill
          sizes="(max-width: 1024px) 100vw, 40vw"
          className="object-cover grayscale"
        />
      </div>

      <div className="flex flex-col justify-center">
        <p className="eyebrow">Perfil</p>
        <h2 className="display-title mt-5 max-w-4xl text-4xl sm:text-5xl lg:text-6xl">
          Programación, sonido e imagen con una misma lógica: construir cosas
          que funcionen y tengan identidad.
        </h2>
        <div className="mt-8 max-w-2xl space-y-5 text-base leading-7 text-black/65 sm:text-lg">
          <p>
            Soy Rubn Pneal, desarrollador de software, y también trabajo como
            compositor, productor musical, ilustrador, diseñador y creador
            audiovisual. Este portfolio reúne esas disciplinas sin convertirlas
            en compartimentos separados.
          </p>
          <p>
            Me interesan especialmente las herramientas de escritorio, la
            automatización, el audio, la inteligencia artificial local y los
            proyectos donde la parte técnica y la creativa tienen que convivir
            de verdad.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold">
          <a
            className="inline-flex items-center gap-2 border-b border-black pb-1"
            href="https://github.com/treska23"
            target="_blank"
            rel="me noreferrer"
          >
            GitHub <ArrowUpRight className="h-4 w-4" />
          </a>
          <a
            className="inline-flex items-center gap-2 border-b border-black pb-1"
            href="https://www.instagram.com/kid.d232/"
            target="_blank"
            rel="me noreferrer"
          >
            Instagram <ArrowUpRight className="h-4 w-4" />
          </a>
          <a
            className="inline-flex items-center gap-2 border-b border-black pb-1"
            href="https://www.tiktok.com/@kiddaccount23"
            target="_blank"
            rel="me noreferrer"
          >
            TikTok <ArrowUpRight className="h-4 w-4" />
          </a>
          <a
            className="inline-flex items-center gap-2 border-b border-black pb-1"
            href="https://www.deviantart.com/treska23"
            target="_blank"
            rel="me noreferrer"
          >
            DeviantArt <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
