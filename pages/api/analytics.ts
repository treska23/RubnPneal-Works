import type { NextApiRequest, NextApiResponse } from 'next';
import { getComicRuntimeEnv } from '@/lib/server/cloudflare';

type AnalyticsPayload = {
  path?: unknown;
  newSession?: unknown;
  referrerHost?: unknown;
  device?: unknown;
};

function text(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.slice(0, maxLength) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const body = (req.body ?? {}) as AnalyticsPayload;
  const path = text(body.path, 240);

  if (!path || !path.startsWith('/')) {
    return res.status(400).end();
  }

  const now = new Date();
  const timestamp = now.toISOString();
  const event = {
    event: 'rubnpneal_pageview',
    path,
    newSession: body.newSession === true,
    referrerHost: text(body.referrerHost, 160),
    device: body.device === 'mobile' ? 'mobile' : 'desktop',
    timestamp,
  };

  // Keep the normal Cloudflare log for live inspection.
  console.log(JSON.stringify(event));

  // Persist every page view as its own R2 object. This avoids lost increments
  // from concurrent visitors and keeps historical analytics beyond log retention.
  try {
    const { COMIC_HD_BUCKET } = getComicRuntimeEnv();
    const day = timestamp.slice(0, 10);
    const key = `analytics/events/${day}/${Date.now()}-${crypto.randomUUID()}.json`;

    await COMIC_HD_BUCKET.put(key, JSON.stringify(event), {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: {
        path: event.path,
        newSession: event.newSession ? '1' : '0',
        referrerHost: event.referrerHost ?? '',
        device: event.device,
        timestamp: event.timestamp,
      },
    });
  } catch (error) {
    console.warn('rubnpneal_analytics_persist_failed', error);
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(204).end();
}
