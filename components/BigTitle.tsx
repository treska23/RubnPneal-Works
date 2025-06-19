// components/BigTitle.tsx
export interface BigTitleProps {
  titleSize?: string; // tamaño de letra en escritorio
  paragraphSize?: string;
}

export default function BigTitle({
  titleSize = "calc(clamp(3rem,12vw,8rem) + 150px)",
  paragraphSize = "clamp(1rem,4vw,2rem)",
}: BigTitleProps) {
  return (
    <section className="bg-white text-black py-16 lg:py-24">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 text-center">
        <h1
          style={
            {
              // tamaño original para escritorio
              "--title-lg": titleSize,
            } as React.CSSProperties
          }
          className="font-notable uppercase tracking-widest leading-none text-4xl sm:text-6xl lg:text-[var(--title-lg)] text-justify"
        >
          Bienvenido a mi sitio
        </h1>
        <p
          style={{ "--paragraph-lg": paragraphSize } as React.CSSProperties}
          className="mt-6 w-full leading-snug text-base sm:text-lg lg:text-[var(--paragraph-lg)] text-justify"
        >
          Un cuento gráfico sobre la relación entre humanos y el silencio de
          los&nbsp;árboles.
        </p>
      </div>
    </section>
  );
}
