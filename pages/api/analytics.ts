import type { NextApiRequest, NextApiResponse } from 'next';

type AnalyticsPayload = {
  path?: unknown;
  newSession?: unknown;
  referrerHost?: unknown;
  device?: unknown;
};

function text(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.slice(0, maxLength) : null;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const body = (req.body ?? {}) as AnalyticsPayload;
  const path = text(body.path, 240);

  if (!path || !path.startsWith('/')) {
    return res.status(400).end();
  }

  const event = {
    event: 'rubnpneal_pageview',
    path,
    newSession: body.newSession === true,
    referrerHost: text(body.referrerHost, 160),
    device: body.device === 'mobile' ? 'mobile' : 'desktop',
  };

  // Cloudflare Workers Observability captures console output. Keeping this as a
  // single JSON object makes page views and visits easy to filter and chart.
  console.log(JSON.stringify(event));

  res.setHeader('Cache-Control', 'no-store');
  return res.status(204).end();
}
