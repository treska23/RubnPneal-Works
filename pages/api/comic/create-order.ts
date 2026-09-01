import type { NextApiRequest, NextApiResponse } from 'next';
import { createComicOrder } from '@/lib/server/paypal';

function getOrigin(req: NextApiRequest) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol =
    typeof forwardedProto === 'string' ? forwardedProto.split(',')[0].trim() : 'https';
  const host = req.headers.host;

  if (!host) throw new Error('Missing request host.');
  return `${protocol}://${host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const amount = typeof req.body?.amount === 'string' ? req.body.amount : '';

  try {
    const origin = getOrigin(req);
    const order = await createComicOrder(
      amount,
      `${origin}/comic?paypal=return`,
      `${origin}/comic?paypal=cancel`,
    );
    return res.status(200).json(order);
  } catch (error) {
    console.error('Could not create PayPal order', error);
    const message = error instanceof Error ? error.message : '';

    if (message.includes('PAYPAL_CONFIG_MISSING')) {
      return res.status(503).json({
        error: 'Falta la configuración de PayPal en Cloudflare.',
      });
    }

    if (message.includes('PAYPAL_AUTH_FAILED') || message.includes('PAYPAL_AUTH_NO_TOKEN')) {
      return res.status(502).json({
        error: 'PayPal ha rechazado las credenciales Live. Revisa Client ID y Secret.',
      });
    }

    if (message.includes('PAYPAL_ORDER_FAILED:400')) {
      return res.status(502).json({
        error: 'PayPal ha rechazado los datos del pedido.',
      });
    }

    if (message.includes('PAYPAL_ORDER_FAILED:403')) {
      return res.status(502).json({
        error: 'La cuenta de PayPal no tiene permiso para crear pagos Live.',
      });
    }

    if (message.includes('PAYPAL_ORDER_FAILED:422')) {
      return res.status(502).json({
        error: 'PayPal no permite este pago con la configuración actual de la cuenta.',
      });
    }

    if (message.includes('Invalid contribution') || message.includes('out of range')) {
      return res.status(400).json({ error: 'Introduce una cantidad válida para continuar.' });
    }

    return res.status(502).json({ error: 'PayPal no ha podido iniciar el pago.' });
  }
}
