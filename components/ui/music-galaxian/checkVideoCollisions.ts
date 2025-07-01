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
      iframe.contentWindow?.postMessage({ event: 'command', func: 'playVideo' }, '*');
      setVideosPlayed((v) => v + 1);
      setYtVisible(true);
      bullet.active = false;
      playSound(explosionSound);
      break;
    }
  }
}
