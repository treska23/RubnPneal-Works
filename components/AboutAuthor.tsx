// components/ui/AboutAuthor.tsx
import Image from "next/image";

export default function AboutAuthor() {
  return (
    <div className="flex flex-col lg:flex-row items-center lg:items-start max-w-4xl mx-auto space-y-6 lg:space-y-0 lg:space-x-8 px-4 py-16">
      {/* Foto del autor */}
      <div className="flex-shrink-0 rounded-full overflow-hidden w-40 h-40 lg:w-48 lg:h-48 shadow-lg">
        <Image
          src="/author.jpg" // Pon aquí tu foto en /public/author.jpg
          alt="Foto del autor"
          width={192}
          height={192}
          className="object-cover"
        />
      </div>

      {/* Texto sobre el autor */}
      <div className="text-center lg:text-left space-y-4">
        <h2 className="text-3xl font-serif font-bold">Sobre el autor</h2>
        <p className="text-lg leading-relaxed">
          Hola, soy Rubén Pneal: ilustrador y autor de este cómic gráfico. Me
          apasiona explorar la relación entre el ser humano y la naturaleza a
          través de imágenes potentes y narrativa visual. Aquí encontrarás mis
          reflexiones, proyectos y próximos lanzamientos.
        </p>
        <p className="text-lg leading-relaxed">
          Si quieres saber más, sígueme en{" "}
          <a
            href="https://www.instagram.com/rubnpneal/?hl=es"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-600 hover:text-blue-800"
          >
            Instagram
          </a>{" "}
          o escríbeme a <strong>ruben.pineal.lopez@hotmail.com</strong>.
        </p>
      </div>
    </div>
  );
}
