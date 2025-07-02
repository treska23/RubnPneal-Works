import { useEffect, useState } from 'react';

export interface SpotifyState {
  token: string | null;
  sdkReady: boolean;
  setToken: (t: string | null) => void;
}

/**
 * Minimal placeholder hook for Spotify integration.
 * Loads the Web Playback SDK and exposes the auth token state.
 */
export function useSpotify(): SpotifyState {
  const [token, setToken] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = 'spotify-sdk';
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.onload = () => setSdkReady(true);
      document.body.appendChild(script);
    } else if (window.Spotify) {
      setSdkReady(true);
    }
    window.onSpotifyWebPlaybackSDKReady = () => setSdkReady(true);
  }, []);

  return { token, sdkReady, setToken };
}

/**
 * Plays a random track from the provided list using the Spotify Web API.
 * Tracks will not repeat until all have been played once.
 */
const historyMap: Record<string, string[]> = {};

export async function playRandomTrack(
  levelSongs: string[],
  token: string,
  levelKey = 'default',
): Promise<string | undefined> {
  if (!token || levelSongs.length === 0) return;

  const history = historyMap[levelKey] || (historyMap[levelKey] = []);
  const remaining = levelSongs.filter((id) => !history.includes(id));
  if (remaining.length === 0) {
    history.length = 0;
    remaining.push(...levelSongs);
  }
  const trackId = remaining[Math.floor(Math.random() * remaining.length)];
  history.push(trackId);

  try {
    await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
    });
    return trackId;
  } catch (err) {
    console.warn('Failed to play track:', err);
    return undefined;
  }
}
