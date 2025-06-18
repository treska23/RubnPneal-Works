// components/BigTitle.tsx
export interface BigTitleProps {
  titleSize?: string; // cualquier unidad CSS válida, ej. "4rem", "10vw", "clamp(3rem,12vw,8rem)"
  paragraphSize?: string;
}

export default function BigTitle({
  titleSize = "calc(clamp(3rem,12vw,8rem) + 150px)",
  paragraphSize = "clamp(1rem,4vw,2rem)",
}: BigTitleProps) {
  return (
    <section className="py-24 bg-white text-black">
      <div className="w-full mx-auto px-4 text-center">
        <h1
          style={{
            fontSize: titleSize,
            textAlign: "justify",
            textAlignLast: "justify",
          }}
          className="font-notable uppercase tracking-widest leading-none"
        >
          Bienvenido a mi sitio
        </h1>
        <p
          style={{
            fontSize: paragraphSize,
            marginTop: "25px",
            textAlign: "justify", // justifica cada línea
            textAlignLast: "justify", // también justifica la última línea
          }}
          className="w-full leading-snug text-justify"
        >
          Un cuento gráfico sobre la relación entre humanos y el silencio de
          los&nbsp;árboles.
        </p>
      </div>
    </section>
  );
}
