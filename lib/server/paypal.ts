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

type PayPalErrorResponse = {
  name?: string;
  error?: string;
  error_description?: string;
  message?: string;
  debug_id?: string;
  details?: Array<{ issue?: string; description?: string; field?: string }>;
};

async function readPayPalError(response: Response) {
  try {
    return (await response.json()) as PayPalErrorResponse;
  } catch {
    return {} as PayPalErrorResponse;
  }
}

async function getPayPalAccessToken() {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = getComicRuntimeEnv();

  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PAYPAL_CONFIG_MISSING');
  }

  const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await readPayPalError(response);
    console.error('PayPal OAuth failed', {
      status: response.status,
      name: error.name || error.error,
      message: error.message || error.error_description,
      debugId: error.debug_id,
    });
    throw new Error(`PAYPAL_AUTH_FAILED:${response.status}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error('PAYPAL_AUTH_NO_TOKEN');
  }

  return data.access_token;
}

type CreateOrderResponse = {
  id?: string;
  message?: string;
  links?: Array<{ href?: string; rel?: string }>;
};

export async function createComicOrder(
  rawAmount: string,
  returnUrl: string,
  cancelUrl: string,
) {
  const amount = normalizeContribution(rawAmount);
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
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
      payment_source: {
        paypal: {
          experience_context: {
            shipping_preference: 'NO_SHIPPING',
            user_action: 'PAY_NOW',
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await readPayPalError(response);
    console.error('PayPal create order failed', {
      status: response.status,
      name: error.name,
      message: error.message,
      debugId: error.debug_id,
      details: error.details,
    });
    throw new Error(`PAYPAL_ORDER_FAILED:${response.status}:${error.name || 'UNKNOWN'}`);
  }

  const data = (await response.json()) as CreateOrderResponse;
  if (!data.id) {
    throw new Error('PAYPAL_ORDER_NO_ID');
  }

  const approveUrl = data.links?.find(
    (link) => link.rel === 'payer-action' || link.rel === 'approve',
  )?.href;

  if (!approveUrl) {
    throw new Error('PAYPAL_ORDER_NO_APPROVAL_URL');
  }

  return { id: data.id, approveUrl };
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
        Accept: 'application/json',
        Prefer: 'return=representation',
        'PayPal-Request-Id': crypto.randomUUID(),
      },
      body: '{}',
    },
  );

  if (!response.ok) {
    const error = await readPayPalError(response);
    console.error('PayPal capture failed', {
      status: response.status,
      name: error.name,
      message: error.message,
      debugId: error.debug_id,
      details: error.details,
    });
    throw new Error(`PAYPAL_CAPTURE_FAILED:${response.status}:${error.name || 'UNKNOWN'}`);
  }

  const data = (await response.json()) as CaptureResponse;
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
    throw new Error('PAYPAL_CAPTURE_INVALID');
  }

  return {
    orderId: data.id || orderId,
    captureId: capture.id || '',
  };
}
