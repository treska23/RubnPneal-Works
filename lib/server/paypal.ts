import { getComicRuntimeEnv } from './cloudflare';

const PAYPAL_API_BASE = 'https://api-m.paypal.com';
const COMIC_PRICE = '4.00';
const COMIC_CURRENCY = 'EUR';

async function getPayPalAccessToken() {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = getComicRuntimeEnv();

  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials are not configured.');
  }

  const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`PayPal authentication failed (${response.status}).`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error('PayPal did not return an access token.');
  }

  return data.access_token;
}

export async function createComicOrder() {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': crypto.randomUUID(),
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          description: 'Cuando los Árboles Dejaron de Hablar — PDF HD',
          custom_id: 'comic-hd',
          amount: {
            currency_code: COMIC_CURRENCY,
            value: COMIC_PRICE,
          },
        },
      ],
    }),
  });

  const data = (await response.json()) as { id?: string; message?: string };
  if (!response.ok || !data.id) {
    throw new Error(data.message || `Could not create PayPal order (${response.status}).`);
  }

  return data.id;
}

type CaptureResponse = {
  id?: string;
  status?: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        amount?: { currency_code?: string; value?: string };
      }>;
    };
  }>;
};

export async function captureComicOrder(orderId: string) {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': crypto.randomUUID(),
      },
      body: '{}',
    },
  );

  const data = (await response.json()) as CaptureResponse & { message?: string };
  if (!response.ok) {
    throw new Error(data.message || `Could not capture PayPal order (${response.status}).`);
  }

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  const validPayment =
    data.status === 'COMPLETED' &&
    capture?.status === 'COMPLETED' &&
    capture.amount?.currency_code === COMIC_CURRENCY &&
    capture.amount?.value === COMIC_PRICE;

  if (!validPayment) {
    throw new Error('PayPal payment was not completed for the expected amount.');
  }

  return {
    orderId: data.id || orderId,
    captureId: capture.id || '',
  };
}
