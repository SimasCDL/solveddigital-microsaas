const AIRBNB_URL_RE = /^https?:\/\/(?:www\.)?airbnb\.[a-z.]{2,10}\/rooms\/(?:plus\/)?\d+/i;

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

/** Extract listing photo URLs (muscache CDN) from a public Airbnb listing page. */
export async function extractListingPhotos(listingUrl: string, max = 12): Promise<string[]> {
  const url = listingUrl.trim();
  if (!AIRBNB_URL_RE.test(url)) {
    throw new Error('Paste an Airbnb listing link like https://www.airbnb.com/rooms/12345678');
  }

  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`Airbnb returned ${res.status} — the listing may be private or temporarily blocked`);
  const html = (await res.text()).replace(/\\u002F/g, '/');

  const matches = html.match(/https:\/\/a0\.muscache\.com\/im\/pictures\/[^"'\\\s)]+/g) ?? [];
  const seen = new Set<string>();
  const photos: string[] = [];
  for (const raw of matches) {
    const clean = raw.replace(/&amp;/g, '&').split('?')[0];
    if (seen.has(clean)) continue;
    // skip avatars, favicons and other non-photo assets
    if (/\/user[s]?\/|profile|platform-assets|favicon/i.test(clean)) continue;
    if (!/\.(jpe?g|png|webp)$/i.test(clean)) continue;
    seen.add(clean);
    photos.push(clean);
    if (photos.length >= max) break;
  }
  return photos;
}
