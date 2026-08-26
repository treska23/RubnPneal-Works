import Head from 'next/head';
import { ArrowUpRight, Github } from 'lucide-react';
import SectionLayout from '@components/SectionLayout';

const projects = [
  { name: 'Tinta ES', status: 'Aplicación local', description: 'Aplicación WPF para traducir y rotular cómics en local: detección de texto, OCR, reconstrucción del dibujo, traducción contextual y composición dentro de la forma real de cada bocadillo.', tags: ['C#', '.NET 10', 'WPF', 'Ollama', 'OCR', 'LaMa'], href: 'https://github.com/treska23/TintaES' },
  { name: 'Drum Practice Studio', status: 'Audio desktop', description: 'Entorno de práctica musical para Windows con MIDI, librerías, VST3, ASIO, playlists, mezcla, grabación, análisis de tempo y separación local de stems mediante Demucs.', tags: ['.NET 10', 'NAudio', 'VST3', 'MIDI', 'ASIO', 'Demucs'], href: 'https://github.com/treska23/Drumless' },
  { name: 'ControlPCIA', status: 'Windows + Android', description: 'Sistema para controlar funciones concretas de un PC Windows desde el móvil: Wake-on-LAN, aplicaciones, ventanas, pantallas, multimedia, ratón y teclado remoto, con traducción local de órdenes mediante Ollama.', tags: ['.NET 10', 'Win32', 'Android', 'PowerShell', 'Ollama', 'LAN'], href: 'https://github.com/treska23/ControlPCIA' },
];

const capabilities = [
  ['Aplicaciones desktop', 'C# / .NET / WPF / MVVM'],
  ['Datos e integración', 'REST APIs / SQL Server / automatización'],
  ['Audio', 'MIDI / ASIO / VST3 / procesamiento'],
  ['IA local', 'Ollama / modelos locales / flujos privados'],
];

export default function DevelopmentPage() {
  return (
    <>
      <Head><title>Programación — RubnPneal</title><meta name="description" content="Proyectos de software y perfil técnico de RubnPneal." /></Head>
      <div className="bg-[#f5f2e8]">
        <SectionLayout eyebrow="Software" title="Programación">
          <div className="grid gap-10 border-t border-black/15 pt-8 lg:grid-cols-[1.3fr_0.7fr] lg:gap-20">
            <p className="max-w-4xl text-3xl font-medium leading-tight tracking-[-0.03em] sm:text-4xl lg:text-5xl">Desarrollo herramientas centradas en problemas reales: escritorio, automatización, audio e inteligencia artificial local.</p>
            <p className="max-w-xl text-base leading-7 text-black/60 lg:pt-2">El foco está en la arquitectura, el comportamiento de la aplicación y una interfaz clara. Los proyectos de esta selección son software funcional, no demos visuales aisladas.</p>
          </div>
        </SectionLayout>
        <section className="mx-auto max-w-[1440px] px-5 pb-20 sm:px-8 sm:pb-28 lg:px-12">
          <div className="border-t border-black/15">
            {projects.map((project, index) => (
              <article key={project.name} className="grid gap-8 border-b border-black/15 py-10 lg:grid-cols-[100px_1fr_1.2fr_auto] lg:items-start lg:gap-10 lg:py-14">
                <span className="font-mono text-xs text-black/40">0{index + 1}</span>
                <div><p className="eyebrow">{project.status}</p><h2 className="display-title mt-3 text-4xl sm:text-5xl">{project.name}</h2></div>
                <div><p className="max-w-2xl text-base leading-7 text-black/65">{project.description}</p><div className="mt-6 flex flex-wrap gap-2">{project.tags.map((tag) => <span key={tag} className="border border-black/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/60">{tag}</span>)}</div></div>
                <a href={project.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4">Código <ArrowUpRight className="h-4 w-4" /></a>
              </article>
            ))}
          </div>
        </section>
        <section className="bg-[#111] text-white"><div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12"><div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20"><div><p className="eyebrow text-white/45">Perfil técnico</p><h2 className="display-title mt-4 text-4xl sm:text-6xl">Tecnología al servicio del uso.</h2></div><div className="border-t border-white/15">{capabilities.map(([title, value]) => <div key={title} className="grid gap-2 border-b border-white/15 py-6 sm:grid-cols-[0.8fr_1.2fr]"><span className="text-sm font-semibold">{title}</span><span className="text-sm leading-6 text-white/55">{value}</span></div>)}<a href="https://github.com/treska23" target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 border-b border-white pb-1 text-sm font-semibold"><Github className="h-4 w-4" /> Ver GitHub completo <ArrowUpRight className="h-4 w-4" /></a></div></div></div></section>
      </div>
    </>
  );
}
