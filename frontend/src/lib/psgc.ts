/**
 * Philippine Standard Geographic Code (PSGC) API Service
 * Provides access to all 82 Provinces, 17 Regions, 1,634 Cities/Municipalities,
 * and 42,000+ Barangays via the official PSGC Open API with local offline caching.
 */

export interface GeoItem {
  code: string;
  name: string;
  regionCode?: string;
  provinceCode?: string;
}

const BASE_URL = 'https://psgc.gitlab.io/api';
const memoryCache = new Map<string, any>();

async function fetchWithCache<T>(url: string): Promise<T> {
  if (memoryCache.has(url)) {
    return memoryCache.get(url) as T;
  }

  // Also check localStorage in browser if available
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`psgc_${url}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        memoryCache.set(url, parsed);
        return parsed as T;
      }
    } catch {}
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch from PSGC API: ${res.statusText}`);
  }
  const data = await res.json();
  memoryCache.set(url, data);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`psgc_${url}`, JSON.stringify(data));
    } catch {}
  }

  return data as T;
}

/**
 * Returns all Philippine Provinces + Metro Manila (NCR) as the top-level option.
 */
export async function getProvinces(): Promise<GeoItem[]> {
  try {
    const rawProvinces = await fetchWithCache<GeoItem[]>(`${BASE_URL}/provinces.json`);
    
    // Sort alphabetically
    const sorted = [...rawProvinces].sort((a, b) => a.name.localeCompare(b.name));

    // Ensure Metro Manila (NCR) is present and placed at the top for convenience
    const ncrItem: GeoItem = {
      code: '130000000',
      name: 'Metro Manila (NCR)',
      regionCode: '130000000',
    };

    return [ncrItem, ...sorted];
  } catch (err) {
    console.warn('PSGC API error loading provinces, falling back:', err);
    return [
      { code: '130000000', name: 'Metro Manila (NCR)' },
      { code: '045800000', name: 'Rizal' },
      { code: '031400000', name: 'Bulacan' },
      { code: '042100000', name: 'Cavite' },
      { code: '043400000', name: 'Laguna' },
      { code: '035400000', name: 'Pampanga' },
      { code: '041000000', name: 'Batangas' },
      { code: '015500000', name: 'Pangasinan' },
    ];
  }
}

/**
 * Returns all Cities and Municipalities for a given Province code (or NCR region code 130000000).
 */
export async function getCitiesMunicipalities(provinceOrRegionCode: string): Promise<GeoItem[]> {
  try {
    let url: string;
    if (provinceOrRegionCode === '130000000') {
      url = `${BASE_URL}/regions/130000000/cities-municipalities.json`;
    } else {
      url = `${BASE_URL}/provinces/${provinceOrRegionCode}/cities-municipalities.json`;
    }
    const data = await fetchWithCache<GeoItem[]>(url);
    return [...data].sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.warn(`PSGC API error loading cities for ${provinceOrRegionCode}:`, err);
    return [];
  }
}

/**
 * Returns all Barangays for a given City or Municipality code.
 */
export async function getBarangays(cityMunCode: string): Promise<GeoItem[]> {
  try {
    const url = `${BASE_URL}/cities-municipalities/${cityMunCode}/barangays.json`;
    const data = await fetchWithCache<GeoItem[]>(url);
    return [...data].sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.warn(`PSGC API error loading barangays for ${cityMunCode}:`, err);
    return [];
  }
}
