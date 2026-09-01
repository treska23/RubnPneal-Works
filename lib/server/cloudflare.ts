import { getCloudflareContext } from '@opennextjs/cloudflare';

const PAYPAL_LIVE_CLIENT_ID =
  'BAAErLc0pF58iECj0-n9324fHyO8JD0u-XTkw6yw6gSwCjoFblyUEIOAI2mncaZlx8vir30tT3TgTgR40E';

type R2ObjectLike = {
  body: ReadableStream<Uint8Array>;
  size: number;
  httpEtag: string;
  range?: { offset: number; length: number };
  writeHttpMetadata(headers: Headers): void;
};

type R2BucketLike = {
  get(
    key: string,
    options?: { range?: Headers },
  ): Promise<R2ObjectLike | null>;
};

export type ComicRuntimeEnv = {
  COMIC_HD_BUCKET: R2BucketLike;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  COMIC_ACCESS_SIGNING_SECRET?: string;
};

export function getComicRuntimeEnv(): ComicRuntimeEnv {
  const { env } = getCloudflareContext();
  const runtimeEnv = env as unknown as ComicRuntimeEnv;

  return {
    ...runtimeEnv,
    PAYPAL_CLIENT_ID:
      runtimeEnv.PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || PAYPAL_LIVE_CLIENT_ID,
    PAYPAL_CLIENT_SECRET:
      runtimeEnv.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET,
    COMIC_ACCESS_SIGNING_SECRET:
      runtimeEnv.COMIC_ACCESS_SIGNING_SECRET || process.env.COMIC_ACCESS_SIGNING_SECRET,
  };
}
