import { useEffect } from 'react';
import { useRouter } from 'next/router';

const SESSION_FLAG = 'rubnpneal-analytics-session';

function cleanPath(url: string) {
  return url.split('#')[0].split('?')[0] || '/';
}

function getReferrerHost() {
  if (!document.referrer) return null;

  try {
    return new URL(document.referrer).hostname || null;
  } catch {
    return null;
  }
}

function trackPageView(path: string) {
  let newSession = false;

  try {
    newSession = sessionStorage.getItem(SESSION_FLAG) !== '1';
    if (newSession) sessionStorage.setItem(SESSION_FLAG, '1');
  } catch {
    // Analytics must never interfere with the site if storage is unavailable.
  }

  const payload = JSON.stringify({
    path: cleanPath(path),
    newSession,
    referrerHost: getReferrerHost(),
    device: window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop',
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/analytics',
        new Blob([payload], { type: 'application/json' }),
      );
      return;
    }
  } catch {
    // Fall back to fetch below.
  }

  void fetch('/api/analytics', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

export default function AnalyticsTracker() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    trackPageView(router.asPath);

    const handleRouteChange = (url: string) => trackPageView(url);
    router.events.on('routeChangeComplete', handleRouteChange);

    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router]);

  return null;
}
