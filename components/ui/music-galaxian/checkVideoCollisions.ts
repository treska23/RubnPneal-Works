// Make sure to import or define 'bullet' above this function.
// Example placeholder definition:
declare const bullet: {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
};
let videosPlayedCounter = 0; // ➊  contador global
let ytVisibleFlag = false; // ➋  visibilidad del reproductor

// Define videoIframes as a NodeListOf<HTMLIFrameElement> by selecting all iframes in the document
const videoIframes: NodeListOf<HTMLIFrameElement> =
  document.querySelectorAll('iframe');

function checkVideoCollisions(now: number) {
  if (!bullet.active) return;
  for (const iframe of videoIframes) {
    const rect = iframe.getBoundingClientRect();
    if (
      rect.bottom < 0 ||
      rect.top > window.innerHeight ||
      rect.right < 0 ||
      rect.left > window.innerWidth
    ) {
      continue;
    }
    const s = 40;
    const x = rect.left + rect.width / 2 - s / 2;
    const y = rect.top + rect.height / 2 - s / 2;
    if (
      bullet.x < x + s &&
      bullet.x + bullet.width > x &&
      bullet.y < y + s &&
      bullet.y + bullet.height > y
    ) {
      try {
        iframe.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
          '*',
        );
      } catch (err) {
        console.warn('No se pudo enviar playVideo al iframe:', err);
      }

      setVideosPlayed((v) => v + 1);
      setYtVisible(true);
      bullet.active = false;
      // Define or import your explosion sound here
      const explosionSound = 'path/to/explosion-sound.mp3'; // Replace with actual sound or import

      playSound(explosionSound);
      break;
    }
  }
}
function setVideosPlayed(updater: (v: number) => number) {
  videosPlayedCounter = updater(videosPlayedCounter);

  // (opcional) refleja el cambio en pantalla si tienes un span con id="videosPlayed"
  const span = document.getElementById('videosPlayed');
  if (span) span.textContent = String(videosPlayedCounter);

  console.log('Vídeos reproducidos →', videosPlayedCounter);
}

/** Muestra u oculta un contenedor que envuelve tu reproductor flotante. */
function setYtVisible(show: boolean) {
  ytVisibleFlag = show;

  // usa el id real de tu div flotante (o la clase)
  const panel = document.getElementById('yt-player-container');
  if (panel) panel.classList.toggle('hidden', !show);

  console.log('Reproductor visible →', show);
}

/** Reproduce un sonido (en la mayoría de navegadores tras el primer gesto del usuario). */
function playSound(src: string) {
  if (!src) return;
  try {
    const audio = new Audio(src);
    audio.play().catch(() => {
      /* normalmente se rechaza si el usuario no ha interactuado */
    });
  } catch (err) {
    console.warn('No se pudo reproducir el sonido:', err);
  }
}
