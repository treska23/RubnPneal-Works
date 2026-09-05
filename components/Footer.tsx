export default function Footer() {
  return (
    <footer className="border-t border-white/15 bg-[#0b0b0b] text-[#f5f2e8]">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 sm:px-8 md:grid-cols-2 lg:px-12">
        <div>
          <p className="eyebrow text-white/45">Rubn Pneal</p>
          <p className="mt-4 max-w-xl text-2xl font-medium leading-tight sm:text-3xl">
            Software, música, imagen y narrativa visual.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <a
            className="footer-link"
            href="mailto:ruben.pineal.lopez@hotmail.com"
          >
            Email
          </a>
          <a
            className="footer-link"
            href="https://github.com/treska23"
            target="_blank"
            rel="me noreferrer"
          >
            GitHub
          </a>
          <a
            className="footer-link"
            href="https://www.instagram.com/kid.d232/"
            target="_blank"
            rel="me noreferrer"
          >
            Instagram · @kid.d232
          </a>
          <a
            className="footer-link"
            href="https://www.tiktok.com/@kiddaccount23"
            target="_blank"
            rel="me noreferrer"
          >
            TikTok · @kiddaccount23
          </a>
          <a
            className="footer-link"
            href="https://www.deviantart.com/treska23"
            target="_blank"
            rel="me noreferrer"
          >
            DeviantArt · treska23
          </a>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1440px] justify-between border-t border-white/10 px-5 py-5 text-[11px] uppercase tracking-[0.16em] text-white/40 sm:px-8 lg:px-12">
        <span>© {new Date().getFullYear()} Rubn Pneal</span>
        <span>Portfolio</span>
      </div>
    </footer>
  );
}
