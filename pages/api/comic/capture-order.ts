import type { NextApiRequest, NextApiResponse } from 'next';
import { captureComicOrder } from '@/lib/server/paypal';
import { createComicAccessToken } from '@/lib/server/comicAccess';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId : '';
  if (!orderId) {
    return res.status(400).json({ error: 'Falta el identificador del pedido.' });
  }

  try {
    const payment = await captureComicOrder(orderId);
    const token = await createComicAccessToken(payment.orderId, payment.captureId);
    return res.status(200).json({
      status: 'COMPLETED',
      token,
      accessUrl: `/api/comic/download?token=${encodeURIComponent(token)}`,
    });
  } catch (error) {
    console.error('Could not capture PayPal order', error);
    return res.status(500).json({ error: 'El pago no pudo confirmarse.' });
  }
}
