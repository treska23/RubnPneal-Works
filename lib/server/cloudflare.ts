import { getCloudflareContext } from '@opennextjs/cloudflare';

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
  return env as unknown as ComicRuntimeEnv;
}
