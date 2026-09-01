import { getComicRuntimeEnv } from './cloudflare';

const ACCESS_TTL_SECONDS = 60 * 60 * 24;

type ComicAccessPayload = {
  orderId: string;
  captureId: string;
  exp: number;
};

function encodeBase64Url(value: Uint8Array | string) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function getSigningKey() {
  const { COMIC_ACCESS_SIGNING_SECRET } = getComicRuntimeEnv();
  if (!COMIC_ACCESS_SIGNING_SECRET) {
    throw new Error('COMIC_ACCESS_SIGNING_SECRET is not configured.');
  }

  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(COMIC_ACCESS_SIGNING_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function createComicAccessToken(orderId: string, captureId: string) {
  const payload: ComicAccessPayload = {
    orderId,
    captureId,
    exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(encodedPayload),
  );

  return `${encodedPayload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifyComicAccessToken(token: string) {
  const [encodedPayload, encodedSignature] = token.split('.');
  if (!encodedPayload || !encodedSignature) return null;

  try {
    const key = await getSigningKey();
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      decodeBase64Url(encodedSignature),
      new TextEncoder().encode(encodedPayload),
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(encodedPayload)),
    ) as ComicAccessPayload;

    if (!payload.orderId || !payload.captureId || payload.exp <= Date.now() / 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
