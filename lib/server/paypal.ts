import { getComicRuntimeEnv } from './cloudflare';

const PAYPAL_API_BASE = 'https://api-m.paypal.com';
const COMIC_CURRENCY = 'EUR';
const MIN_CONTRIBUTION = 0.01;
const MAX_CONTRIBUTION = 9999.99;

function normalizeContribution(rawAmount: string) {
  const normalized = rawAmount.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error('Invalid contribution amount.');
  }

  const amount = Number(normalized);
  if (
    !Number.isFinite(amount) ||
    amount < MIN_CONTRIBUTION ||
    amount > MAX_CONTRIBUTION
  ) {
    throw new Error('Contribution amount is out of range.');
  }

  return amount.toFixed(2);
}

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

export async function createComicOrder(rawAmount: string) {
  const amount = normalizeContribution(rawAmount);
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
            value: amount,
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
    custom_id?: string;
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

  const purchaseUnit = data.purchase_units?.[0];
  const capture = purchaseUnit?.payments?.captures?.[0];
  const capturedAmount = Number(capture?.amount?.value);
  const validPayment =
    data.status === 'COMPLETED' &&
    purchaseUnit?.custom_id === 'comic-hd' &&
    capture?.status === 'COMPLETED' &&
    capture.amount?.currency_code === COMIC_CURRENCY &&
    Number.isFinite(capturedAmount) &&
    capturedAmount >= MIN_CONTRIBUTION &&
    capturedAmount <= MAX_CONTRIBUTION;

  if (!validPayment) {
    throw new Error('PayPal payment was not completed correctly.');
  }

  return {
    orderId: data.id || orderId,
    captureId: capture.id || '',
  };
}
