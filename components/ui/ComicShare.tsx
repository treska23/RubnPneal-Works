import { useState } from 'react';
import { absoluteUrl } from '@/lib/seo';

// Use the public reading URL, never a payment return or private access token.
const shareUrl = absoluteUrl(
  '/comic?utm_source=lector&utm_medium=share&utm_campaign=comic',
);

export default function ComicShare() {
  const [message, setMessage] = useState('');

  async function shareComic() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Cuando los Árboles Dejaron de Hablar',
          text: 'Lee la novela gráfica completa de Rubn Pneal en el navegador. La edición HD está disponible mediante una aportación voluntaria.',
          url: shareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setMessage('Enlace copiado. Ya puedes compartirlo.');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setMessage('Puedes copiar el enlace que aparece debajo.');
    }
  }

  return (
    <section className="mt-12 border-t border-black/15 pt-8">
      <h2 className="text-2xl font-semibold">Comparte la historia</h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-black/65">
        Si conoces a alguien a quien pueda interesarle, envíale el enlace para
        que pueda leerla completa.
      </p>
      <button
        type="button"
        onClick={() => void shareComic()}
        className="button-dark mt-5"
      >
        Compartir la novela gráfica
      </button>
      <p className="mt-3 min-h-6 text-sm text-black/60" role="status">
        {message}
      </p>
      {message.startsWith('Puedes') && (
        <a href={shareUrl} className="block break-all text-sm underline">
          {shareUrl}
        </a>
      )}
    </section>
  );
}
