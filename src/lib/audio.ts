export function playBeep({
  frequency = 440,
  duration = 0.15,
  volume = 0.5,
  type = 'sine',
}: {
  frequency?: number;
  duration?: number;
  volume?: number;
  type?: OscillatorType;
} = {}): void {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + duration);

  oscillator.onended = () => ctx.close();
}

export function playPowerup(): void {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = 'square';
  oscillator.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.3, now);
  oscillator.frequency.setValueAtTime(300, now);
  oscillator.frequency.linearRampToValueAtTime(1200, now + 0.5);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  oscillator.start();
  oscillator.stop(now + 0.5);

  oscillator.onended = () => ctx.close();
}
