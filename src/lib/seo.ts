export const SITE_ORIGIN =
  'https://rubnpneal-works.treska23.workers.dev';
export const SITE_NAME = 'RubnPneal Works';
export const DEFAULT_SOCIAL_IMAGE = '/og-rubnpneal-works.jpg';

export const SOCIAL_PROFILES = [
  'https://github.com/treska23',
  'https://www.instagram.com/kid.d232/',
  'https://www.tiktok.com/@kiddaccount23',
  'https://www.deviantart.com/treska23',
  'https://www.youtube.com/channel/UCAyA9gTo-GPaKNnlulvS8iw',
  'https://open.spotify.com/artist/24cB9jl7geMfGyDiW29KlY',
] as const;

export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

export function breadcrumbStructuredData(
  items: Array<{ name: string; path: string }>,
) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
