import type { NextApiRequest, NextApiResponse } from 'next';
import { createComicOrder } from '@/lib/server/paypal';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const id = await createComicOrder();
    return res.status(200).json({ id });
  } catch (error) {
    console.error('Could not create PayPal order', error);
    return res.status(500).json({ error: 'No se pudo iniciar el pago con PayPal.' });
  }
}
