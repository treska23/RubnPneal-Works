import { readFile } from 'node:fs/promises';

const SITE_ORIGIN = 'https://rubnpneal-works.treska23.workers.dev';
const INDEXNOW_KEY = '758f84da60f1254793a20838fe5fcc97';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const KEY_LOCATION = `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`;

const sitemapPath = new URL('../public/sitemap.xml', import.meta.url);
const sitemap = await readFile(sitemapPath, 'utf8');
const urlList = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
  .map((match) => match[1].trim())
  .filter((url) => new URL(url).origin === SITE_ORIGIN);

if (urlList.length === 0) {
  throw new Error('No se encontraron URLs del sitio en public/sitemap.xml.');
}

const payload = {
  host: new URL(SITE_ORIGIN).host,
  key: INDEXNOW_KEY,
  keyLocation: KEY_LOCATION,
  urlList,
};

if (process.argv.includes('--dry-run')) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const keyResponse = await fetch(KEY_LOCATION);
if (!keyResponse.ok || (await keyResponse.text()).trim() !== INDEXNOW_KEY) {
  throw new Error(
    `La clave de IndexNow todavía no está publicada en ${KEY_LOCATION}.`,
  );
}

const response = await fetch(INDEXNOW_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload),
});

if (![200, 202].includes(response.status)) {
  const details = (await response.text()).trim();
  throw new Error(
    `IndexNow respondió ${response.status}${details ? `: ${details}` : ''}.`,
  );
}

console.log(
  `IndexNow ha recibido ${urlList.length} URLs (HTTP ${response.status}).`,
);
