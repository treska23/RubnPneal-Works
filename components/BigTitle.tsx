// components/BigTitle.tsx

export default function BigTitle() {
  return (
    <section className="py-24 bg-white text-black">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <h1
          className={`
            font-notable
            text-[12vw] sm:text-[10vw] md:text-[8vw]
            lg:text-[6vw] xl:text-[5vw]
            uppercase tracking-widest leading-none
          `}
        >
          Bienvenido a mi sitio
        </h1>
        <p
          className="
            mt-4
            text-[4vw] sm:text-[3vw] md:text-[2.5vw] lg:text-[2vw]
            max-w-2xl mx-auto leading-snug
            text-center
          "
        >
          Un cuento gráfico sobre la relación entre humanos y el silencio de
          los&nbsp;árboles.
        </p>
      </div>
    </section>
  );
}
