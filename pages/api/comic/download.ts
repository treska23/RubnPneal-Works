import type { NextApiRequest, NextApiResponse } from 'next';
import { getComicRuntimeEnv } from '@/lib/server/cloudflare';
import { verifyComicAccessToken } from '@/lib/server/comicAccess';

const COMIC_OBJECT_KEY = 'comic-hd.pdf';

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method not allowed');
  }

  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token || !(await verifyComicAccessToken(token))) {
    return res.status(401).end('Acceso no autorizado.');
  }

  const { COMIC_HD_BUCKET } = getComicRuntimeEnv();
  const rangeHeaders = new Headers();
  if (req.headers.range) rangeHeaders.set('Range', req.headers.range);

  const object = await COMIC_HD_BUCKET.get(COMIC_OBJECT_KEY, {
    range: rangeHeaders,
  });

  if (!object) {
    return res.status(404).end('PDF no encontrado.');
  }

  const isRange = Boolean(object.range);
  const start = object.range?.offset ?? 0;
  const length = object.range?.length ?? object.size;
  const end = start + length - 1;

  res.statusCode = isRange ? 206 : 200;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', "inline; filename*=UTF-8''Cuando%20los%20%C3%81rboles%20Dejaron%20de%20Hablar.pdf");
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('ETag', object.httpEtag);
  res.setHeader('Content-Length', String(length));

  if (isRange) {
    res.setHeader('Content-Range', `bytes ${start}-${end}/${object.size}`);
  }

  const reader = object.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return res.end();
}
