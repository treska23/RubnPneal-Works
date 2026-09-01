import type { NextApiRequest, NextApiResponse } from 'next';
import { getComicRuntimeEnv } from '@/lib/server/cloudflare';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { PAYPAL_CLIENT_ID } = getComicRuntimeEnv();
  if (!PAYPAL_CLIENT_ID) {
    return res.status(503).json({ error: 'PayPal is not configured.' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ clientId: PAYPAL_CLIENT_ID });
}
