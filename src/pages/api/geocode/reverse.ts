import type { NextApiRequest, NextApiResponse } from 'next';

interface ReverseResult {
  unit: string;
  house: string;
  street: string;
  suburb: string;
}

const EMPTY: ReverseResult = { unit: '', house: '', street: '', suburb: '' };

// Google Geocoding API interpolates house numbers along streets, so it can
// return a street number even where OSM has no address point for the building.
// The Referer header lets browser keys with HTTP-referrer restrictions (like
// the v1 NEXT_PUBLIC key) work from this server-side call.
async function googleReverse(lat: string, lon: string, key: string, referer: string): Promise<ReverseResult | null> {
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}` +
    `&result_type=street_address|premise|subpremise&key=${key}`;
  const r = await fetch(url, { headers: { Referer: referer } });
  if (!r.ok) return null;
  const data = await r.json();
  if (data.status !== 'OK' || !data.results?.length) return null;

  type Component = { long_name: string; short_name: string; types: string[] };
  const results = data.results as { address_components: Component[] }[];
  const best =
    results.find(res => res.address_components.some(c => c.types.includes('street_number'))) ||
    results[0];
  const comp = (type: string) =>
    best.address_components.find(c => c.types.includes(type))?.long_name || '';

  const result: ReverseResult = {
    unit: comp('subpremise'),
    house: comp('street_number'),
    street: comp('route'),
    suburb: comp('locality') || comp('sublocality') || comp('postal_town'),
  };
  return result.house || result.street ? result : null;
}

async function nominatimReverse(lat: string, lon: string): Promise<ReverseResult | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}` +
    `&format=jsonv2&addressdetails=1&zoom=18`;
  const r = await fetch(url, {
    headers: { 'User-Agent': 'NotAtHome/2.0 (https://nothome.app)' },
  });
  if (!r.ok) return null;
  const geo = await r.json();
  const a = geo.address || {};
  return {
    unit: a.unit || '',
    house: a.house_number || '',
    street: a.road || a.street || '',
    suburb: a.suburb || a.city || a.town || a.village || '',
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const { lat, lon } = req.query as { lat?: string; lon?: string };
  if (!lat || !lon || isNaN(Number(lat)) || isNaN(Number(lon))) {
    return res.status(400).json({ error: 'lat and lon required' });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (key) {
    try {
      const referer = `https://${req.headers.host || 'nothome.app'}/`;
      const g = await googleReverse(lat, lon, key, referer);
      if (g) return res.status(200).json(g);
    } catch {
      // fall through to Nominatim
    }
  }

  try {
    const n = await nominatimReverse(lat, lon);
    if (n) return res.status(200).json(n);
  } catch {
    // fall through to empty result
  }

  return res.status(200).json(EMPTY);
}
