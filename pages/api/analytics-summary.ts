import type { NextApiRequest, NextApiResponse } from 'next';
import { getComicRuntimeEnv } from '@/lib/server/cloudflare';

type Counter = Record<string, number>;

type AnalyticsSummary = {
  periodDays: number;
  generatedAt: string;
  totals: {
    visits: number;
    pageViews: number;
  };
  devices: {
    desktop: number;
    mobile: number;
  };
  pages: Array<{ path: string; views: number }>;
  referrers: Array<{ host: string; views: number }>;
  daily: Array<{ date: string; visits: number; pageViews: number }>;
};

function increment(counter: Counter, key: string) {
  counter[key] = (counter[key] ?? 0) + 1;
}

function toRankedArray(counter: Counter, keyName: 'path' | 'host', limit: number) {
  return Object.entries(counter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, views]) => ({ [keyName]: key, views }));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalyticsSummary | { error: string }>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestedDays = Number.parseInt(String(req.query.days ?? '7'), 10);
  const periodDays = [1, 7, 30].includes(requestedDays) ? requestedDays : 7;
  const now = Date.now();
  const cutoff = now - periodDays * 24 * 60 * 60 * 1000;

  const pages: Counter = {};
  const referrers: Counter = {};
  const dailyViews: Counter = {};
  const dailyVisits: Counter = {};
  const devices = { desktop: 0, mobile: 0 };
  let visits = 0;
  let pageViews = 0;

  try {
    const { COMIC_HD_BUCKET } = getComicRuntimeEnv();
    let cursor: string | undefined;
    let scanned = 0;

    do {
      const result = await COMIC_HD_BUCKET.list({
        prefix: 'analytics/events/',
        cursor,
        limit: 1000,
        include: ['customMetadata'],
      });

      for (const object of result.objects) {
        scanned += 1;
        if (scanned > 50000) break;

        const metadata = object.customMetadata ?? {};
        const timestamp = Date.parse(metadata.timestamp ?? '');
        if (!Number.isFinite(timestamp) || timestamp < cutoff) continue;

        const path = metadata.path || '/';
        const device = metadata.device === 'mobile' ? 'mobile' : 'desktop';
        const isNewSession = metadata.newSession === '1';
        const referrerHost = metadata.referrerHost || '';
        const date = new Date(timestamp).toISOString().slice(0, 10);

        pageViews += 1;
        devices[device] += 1;
        increment(pages, path);
        increment(dailyViews, date);

        if (referrerHost) increment(referrers, referrerHost);

        if (isNewSession) {
          visits += 1;
          increment(dailyVisits, date);
        }
      }

      if (scanned > 50000 || !result.truncated) break;
      cursor = result.cursor;
    } while (cursor);

    const dailyDates = Array.from(
      new Set([...Object.keys(dailyViews), ...Object.keys(dailyVisits)]),
    ).sort();

    const summary: AnalyticsSummary = {
      periodDays,
      generatedAt: new Date().toISOString(),
      totals: { visits, pageViews },
      devices,
      pages: toRankedArray(pages, 'path', 20) as AnalyticsSummary['pages'],
      referrers: toRankedArray(referrers, 'host', 10) as AnalyticsSummary['referrers'],
      daily: dailyDates.map((date) => ({
        date,
        visits: dailyVisits[date] ?? 0,
        pageViews: dailyViews[date] ?? 0,
      })),
    };

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(summary);
  } catch (error) {
    console.error('rubnpneal_analytics_summary_failed', error);
    return res.status(500).json({ error: 'Could not load analytics' });
  }
}
