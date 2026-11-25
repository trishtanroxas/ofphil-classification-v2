/**
 * Philippine Standard Geographic Code (PSGC) API Service
 * Provides cascading access to all 17 Regions, 82 Provinces + 4 NCR Districts,
 * 1,634 Cities/Municipalities, and 42,000+ Barangays via the official PSGC Open API
 * with local memory + localStorage caching and offline fallbacks.
 */

export interface GeoItem {
  code: string;
  name: string;
  regionName?: string;
  regionCode?: string;
  provinceCode?: string;
  districtCode?: string;
  isDistrict?: boolean;
}

const BASE_URL = 'https://psgc.gitlab.io/api';
const memoryCache = new Map<string, any>();

export const FALLBACK_REGIONS: GeoItem[] = [
  { code: '130000000', name: 'National Capital Region (NCR)', regionName: 'National Capital Region' },
  { code: '140000000', name: 'Cordillera Administrative Region (CAR)', regionName: 'Cordillera Administrative Region' },
  { code: '010000000', name: 'Region I (Ilocos Region)', regionName: 'Ilocos Region' },
  { code: '020000000', name: 'Region II (Cagayan Valley)', regionName: 'Cagayan Valley' },
  { code: '030000000', name: 'Region III (Central Luzon)', regionName: 'Central Luzon' },
  { code: '040000000', name: 'Region IV-A (CALABARZON)', regionName: 'CALABARZON' },
  { code: '170000000', name: 'MIMAROPA Region', regionName: 'MIMAROPA Region' },
  { code: '050000000', name: 'Region V (Bicol Region)', regionName: 'Bicol Region' },
  { code: '060000000', name: 'Region VI (Western Visayas)', regionName: 'Western Visayas' },
  { code: '070000000', name: 'Region VII (Central Visayas)', regionName: 'Central Visayas' },
  { code: '080000000', name: 'Region VIII (Eastern Visayas)', regionName: 'Eastern Visayas' },
  { code: '090000000', name: 'Region IX (Zamboanga Peninsula)', regionName: 'Zamboanga Peninsula' },
  { code: '100000000', name: 'Region X (Northern Mindanao)', regionName: 'Northern Mindanao' },
  { code: '110000000', name: 'Region XI (Davao Region)', regionName: 'Davao Region' },
  { code: '120000000', name: 'Region XII (SOCCSKSARGEN)', regionName: 'SOCCSKSARGEN' },
  { code: '160000000', name: 'Region XIII (Caraga)', regionName: 'Caraga' },
  { code: '150000000', name: 'BARMM (Bangsamoro Autonomous Region)', regionName: 'Bangsamoro Autonomous Region in Muslim Mindanao' },
];

export const NCR_DISTRICTS_FALLBACK: GeoItem[] = [
  { code: '130000000', name: 'Metro Manila (NCR)', regionCode: '130000000', isDistrict: false },
  { code: '133900000', name: 'NCR, First District (Manila)', regionCode: '130000000', isDistrict: true },
  { code: '137400000', name: 'NCR, Second District (Eastern Manila)', regionCode: '130000000', isDistrict: true },
  { code: '137500000', name: 'NCR, Third District (CAMANAVA)', regionCode: '130000000', isDistrict: true },
  { code: '137600000', name: 'NCR, Fourth District (Southern Manila)', regionCode: '130000000', isDistrict: true },
];

const FALLBACK_PROVINCES_BY_REGION: Record<string, GeoItem[]> = {
  '130000000': NCR_DISTRICTS_FALLBACK,
  '140000000': [
    { code: '141100000', name: 'Benguet', regionCode: '140000000' },
    { code: '140100000', name: 'Abra', regionCode: '140000000' },
    { code: '142700000', name: 'Ifugao', regionCode: '140000000' },
    { code: '143200000', name: 'Kalinga', regionCode: '140000000' },
    { code: '144400000', name: 'Mountain Province', regionCode: '140000000' },
    { code: '148100000', name: 'Apayao', regionCode: '140000000' },
  ],
  '010000000': [
    { code: '012800000', name: 'Ilocos Norte', regionCode: '010000000' },
    { code: '012900000', name: 'Ilocos Sur', regionCode: '010000000' },
    { code: '013300000', name: 'La Union', regionCode: '010000000' },
    { code: '015500000', name: 'Pangasinan', regionCode: '010000000' },
  ],
  '020000000': [
    { code: '021500000', name: 'Cagayan', regionCode: '020000000' },
    { code: '023100000', name: 'Isabela', regionCode: '020000000' },
    { code: '025000000', name: 'Nueva Vizcaya', regionCode: '020000000' },
    { code: '025700000', name: 'Quirino', regionCode: '020000000' },
    { code: '020900000', name: 'Batanes', regionCode: '020000000' },
  ],
  '030000000': [
    { code: '030800000', name: 'Bataan', regionCode: '030000000' },
    { code: '031400000', name: 'Bulacan', regionCode: '030000000' },
    { code: '034900000', name: 'Nueva Ecija', regionCode: '030000000' },
    { code: '035400000', name: 'Pampanga', regionCode: '030000000' },
    { code: '036900000', name: 'Tarlac', regionCode: '030000000' },
    { code: '037100000', name: 'Zambales', regionCode: '030000000' },
    { code: '037700000', name: 'Aurora', regionCode: '030000000' },
  ],
  '040000000': [
    { code: '041000000', name: 'Batangas', regionCode: '040000000' },
    { code: '042100000', name: 'Cavite', regionCode: '040000000' },
    { code: '043400000', name: 'Laguna', regionCode: '040000000' },
    { code: '045600000', name: 'Quezon', regionCode: '040000000' },
    { code: '045800000', name: 'Rizal', regionCode: '040000000' },
  ],
  '170000000': [
    { code: '174000000', name: 'Marinduque', regionCode: '170000000' },
    { code: '175100000', name: 'Occidental Mindoro', regionCode: '170000000' },
    { code: '175200000', name: 'Oriental Mindoro', regionCode: '170000000' },
    { code: '175300000', name: 'Palawan', regionCode: '170000000' },
    { code: '175900000', name: 'Romblon', regionCode: '170000000' },
  ],
  '050000000': [
    { code: '050500000', name: 'Albay', regionCode: '050000000' },
    { code: '051600000', name: 'Camarines Norte', regionCode: '050000000' },
    { code: '051700000', name: 'Camarines Sur', regionCode: '050000000' },
    { code: '052000000', name: 'Catanduanes', regionCode: '050000000' },
    { code: '054100000', name: 'Masbate', regionCode: '050000000' },
    { code: '056200000', name: 'Sorsogon', regionCode: '050000000' },
  ],
  '060000000': [
    { code: '060400000', name: 'Aklan', regionCode: '060000000' },
    { code: '060600000', name: 'Antique', regionCode: '060000000' },
    { code: '061900000', name: 'Capiz', regionCode: '060000000' },
    { code: '063000000', name: 'Iloilo', regionCode: '060000000' },
    { code: '064500000', name: 'Negros Occidental', regionCode: '060000000' },
    { code: '067900000', name: 'Guimaras', regionCode: '060000000' },
  ],
  '070000000': [
    { code: '071200000', name: 'Bohol', regionCode: '070000000' },
    { code: '072200000', name: 'Cebu', regionCode: '070000000' },
    { code: '074600000', name: 'Negros Oriental', regionCode: '070000000' },
    { code: '076100000', name: 'Siquijor', regionCode: '070000000' },
  ],
  '080000000': [
    { code: '083700000', name: 'Leyte', regionCode: '080000000' },
    { code: '086000000', name: 'Samar', regionCode: '080000000' },
    { code: '082600000', name: 'Eastern Samar', regionCode: '080000000' },
    { code: '084800000', name: 'Northern Samar', regionCode: '080000000' },
    { code: '086400000', name: 'Southern Leyte', regionCode: '080000000' },
    { code: '087800000', name: 'Biliran', regionCode: '080000000' },
  ],
  '090000000': [
    { code: '097200000', name: 'Zamboanga del Norte', regionCode: '090000000' },
    { code: '097300000', name: 'Zamboanga del Sur', regionCode: '090000000' },
    { code: '098300000', name: 'Zamboanga Sibugay', regionCode: '090000000' },
  ],
  '100000000': [
    { code: '101300000', name: 'Bukidnon', regionCode: '100000000' },
    { code: '101800000', name: 'Camiguin', regionCode: '100000000' },
    { code: '103500000', name: 'Lanao del Norte', regionCode: '100000000' },
    { code: '104200000', name: 'Misamis Occidental', regionCode: '100000000' },
    { code: '104300000', name: 'Misamis Oriental', regionCode: '100000000' },
  ],
  '110000000': [
    { code: '112300000', name: 'Davao del Norte', regionCode: '110000000' },
    { code: '112400000', name: 'Davao del Sur', regionCode: '110000000' },
    { code: '112500000', name: 'Davao Oriental', regionCode: '110000000' },
    { code: '118200000', name: 'Davao de Oro', regionCode: '110000000' },
    { code: '118600000', name: 'Davao Occidental', regionCode: '110000000' },
  ],
  '120000000': [
    { code: '124700000', name: 'Cotabato', regionCode: '120000000' },
    { code: '126300000', name: 'South Cotabato', regionCode: '120000000' },
    { code: '126500000', name: 'Sultan Kudarat', regionCode: '120000000' },
    { code: '128000000', name: 'Sarangani', regionCode: '120000000' },
  ],
  '160000000': [
    { code: '160200000', name: 'Agusan del Norte', regionCode: '160000000' },
    { code: '160300000', name: 'Agusan del Sur', regionCode: '160000000' },
    { code: '166700000', name: 'Surigao del Norte', regionCode: '160000000' },
    { code: '166800000', name: 'Surigao del Sur', regionCode: '160000000' },
    { code: '168500000', name: 'Dinagat Islands', regionCode: '160000000' },
  ],
  '150000000': [
    { code: '150700000', name: 'Basilan', regionCode: '150000000' },
    { code: '153600000', name: 'Lanao del Sur', regionCode: '150000000' },
    { code: '153800000', name: 'Maguindanao', regionCode: '150000000' },
    { code: '156600000', name: 'Sulu', regionCode: '150000000' },
    { code: '157000000', name: 'Tawi-Tawi', regionCode: '150000000' },
  ],
};

const FALLBACK_CITIES_BY_CODE: Record<string, GeoItem[]> = {
  '130000000': [
    { code: '133900000_manila', name: 'City of Manila' },
    { code: '137404000', name: 'Quezon City' },
    { code: '137501000', name: 'Caloocan City' },
    { code: '137403000', name: 'Pasig City' },
    { code: '137602000', name: 'Makati City' },
    { code: '137607000', name: 'Taguig City' },
    { code: '137401000', name: 'Mandaluyong City' },
    { code: '137402000', name: 'Marikina City' },
    { code: '137604000', name: 'Parañaque City' },
    { code: '137605000', name: 'Pasay City' },
    { code: '137601000', name: 'Las Piñas City' },
    { code: '137603000', name: 'Muntinlupa City' },
    { code: '137502000', name: 'Malabon City' },
    { code: '137503000', name: 'Navotas City' },
    { code: '137504000', name: 'Valenzuela City' },
    { code: '137405000', name: 'San Juan City' },
    { code: '137606000', name: 'Pateros' },
  ],
  '133900000': [{ code: '133900000_manila', name: 'City of Manila' }],
  '137400000': [
    { code: '137401000', name: 'Mandaluyong City' },
    { code: '137402000', name: 'Marikina City' },
    { code: '137403000', name: 'Pasig City' },
    { code: '137404000', name: 'Quezon City' },
    { code: '137405000', name: 'San Juan City' },
  ],
  '137500000': [
    { code: '137501000', name: 'Caloocan City' },
    { code: '137502000', name: 'Malabon City' },
    { code: '137503000', name: 'Navotas City' },
    { code: '137504000', name: 'Valenzuela City' },
  ],
  '137600000': [
    { code: '137601000', name: 'Las Piñas City' },
    { code: '137602000', name: 'Makati City' },
    { code: '137603000', name: 'Muntinlupa City' },
    { code: '137604000', name: 'Parañaque City' },
    { code: '137605000', name: 'Pasay City' },
    { code: '137606000', name: 'Pateros' },
    { code: '137607000', name: 'Taguig City' },
  ],
  '045800000': [
    { code: '045802000', name: 'Antipolo City' },
    { code: '045805000', name: 'Cainta' },
    { code: '045813000', name: 'Taytay' },
    { code: '045811000', name: 'San Mateo' },
    { code: '045804000', name: 'Binangonan' },
  ],
  '031400000': [
    { code: '031410000', name: 'Malolos City' },
    { code: '031420000', name: 'San Jose del Monte City' },
    { code: '031412000', name: 'Meycauayan City' },
    { code: '031411000', name: 'Marilao' },
  ],
  '042100000': [
    { code: '042103000', name: 'Bacoor City' },
    { code: '042106000', name: 'Dasmariñas City' },
    { code: '042108000', name: 'General Trias City' },
    { code: '042109000', name: 'Imus City' },
  ],
  '043400000': [
    { code: '043403000', name: 'Biñan City' },
    { code: '043405000', name: 'Calamba City' },
    { code: '043425000', name: 'San Pedro City' },
    { code: '043428000', name: 'Santa Rosa City' },
  ],
};

const FALLBACK_BARANGAYS_BY_CITY: Record<string, GeoItem[]> = {
  '133900000_manila': [
    { code: 'bgy_659', name: 'Barangay 659 (Intramuros)' },
    { code: 'bgy_660', name: 'Barangay 660 (Ermita)' },
    { code: 'bgy_666', name: 'Barangay 666 (Malate)' },
    { code: 'bgy_400', name: 'Barangay 400 (Sampaloc)' },
    { code: 'bgy_300', name: 'Barangay 300 (Santa Cruz)' },
    { code: 'bgy_200', name: 'Barangay 200 (Tondo)' },
    { code: 'bgy_800', name: 'Barangay 800 (Paco)' },
  ],
  '137501000': [
    { code: 'bgy_cal_1', name: 'Barangay 1' },
    { code: 'bgy_cal_12', name: 'Barangay 12' },
    { code: 'bgy_cal_73', name: 'Barangay 73' },
    { code: 'bgy_cal_171', name: 'Barangay 171 (Bagumbong)' },
    { code: 'bgy_cal_178', name: 'Barangay 178 (Camarin)' },
  ],
  '137404000': [
    { code: 'bgy_qc_1', name: 'Batasan Hills' },
    { code: 'bgy_qc_2', name: 'Commonwealth' },
    { code: 'bgy_qc_3', name: 'Diliman' },
    { code: 'bgy_qc_4', name: 'Fairview' },
    { code: 'bgy_qc_5', name: 'Kamuning' },
    { code: 'bgy_qc_6', name: 'Novaliches Proper' },
    { code: 'bgy_qc_7', name: 'Tandang Sora' },
  ],
  '137403000': [
    { code: 'bgy_pas_1', name: 'Bagong Ilog' },
    { code: 'bgy_pas_2', name: 'Kapitolyo' },
    { code: 'bgy_pas_3', name: 'Pinagbuhatan' },
    { code: 'bgy_pas_4', name: 'Rosario' },
    { code: 'bgy_pas_5', name: 'San Nicolas' },
    { code: 'bgy_pas_6', name: 'Ugong' },
  ],
};

async function fetchWithCache<T>(url: string): Promise<T> {
  if (memoryCache.has(url)) {
    return memoryCache.get(url) as T;
  }

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
 * Returns all 17 Philippine Regions, placing NCR at the top for clinic convenience.
 */
export async function getRegions(): Promise<GeoItem[]> {
  try {
    const raw = await fetchWithCache<any[]>(`${BASE_URL}/regions.json`);
    const mapped: GeoItem[] = raw.map((r) => {
      const fallbackMatch = FALLBACK_REGIONS.find((fr) => fr.code === r.code);
      const displayName =
        fallbackMatch?.name ||
        (r.regionName && r.name && !r.regionName.includes(r.name)
          ? `${r.name} (${r.regionName})`
          : r.regionName || r.name);
      return {
        code: r.code,
        name: displayName,
        regionName: r.regionName || r.name,
        regionCode: r.code,
      };
    });
    const ncr = mapped.filter((r) => r.code === '130000000');
    const rest = mapped.filter((r) => r.code !== '130000000');
    return [...ncr, ...rest];
  } catch (err) {
    console.warn('PSGC API error loading regions, falling back:', err);
    return FALLBACK_REGIONS;
  }
}

/**
 * Returns Provinces (or NCR Districts + Metro Manila option when regionCode === '130000000')
 * belonging strictly to the selected Philippine Region.
 */
export async function getProvincesOrDistrictsByRegion(regionCode: string): Promise<GeoItem[]> {
  if (!regionCode) return [];

  if (regionCode === '130000000') {
    try {
      const districts = await fetchWithCache<any[]>(`${BASE_URL}/regions/130000000/districts.json`);
      const mappedDistricts: GeoItem[] = districts.map((d) => ({
        code: d.code,
        name: d.name.startsWith('NCR') ? d.name : `NCR, ${d.name}`,
        regionCode: '130000000',
        isDistrict: true,
      }));
      return [
        { code: '130000000', name: 'Metro Manila (NCR)', regionCode: '130000000', isDistrict: false },
        ...mappedDistricts,
      ];
    } catch {
      return NCR_DISTRICTS_FALLBACK;
    }
  }

  try {
    const provs = await fetchWithCache<GeoItem[]>(`${BASE_URL}/regions/${regionCode}/provinces.json`);
    const sorted = [...provs]
      .map((p) => ({ ...p, regionCode }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return sorted.length > 0 ? sorted : FALLBACK_PROVINCES_BY_REGION[regionCode] || [];
  } catch {
    return FALLBACK_PROVINCES_BY_REGION[regionCode] || [];
  }
}

/**
 * Resolves a matching Region GeoItem from an existing patient region/province string.
 */
export async function resolveRegionItem(
  regionHint: string,
  provinceHint: string,
  regions?: GeoItem[]
): Promise<GeoItem> {
  const list = regions && regions.length > 0 ? regions : await getRegions();
  const rNorm = (regionHint || '').trim().toLowerCase();
  const pNorm = (provinceHint || '').trim().toLowerCase();

  if (
    rNorm.includes('ncr') ||
    rNorm.includes('metro manila') ||
    rNorm.includes('national capital') ||
    pNorm.includes('ncr') ||
    pNorm.includes('metro manila') ||
    pNorm.includes('district')
  ) {
    return list.find((r) => r.code === '130000000') || list[0];
  }

  if (rNorm) {
    const direct = list.find(
      (r) =>
        r.name.toLowerCase() === rNorm ||
        (r.regionName && r.regionName.toLowerCase() === rNorm) ||
        r.name.toLowerCase().includes(rNorm) ||
        rNorm.includes((r.regionName || '').toLowerCase())
    );
    if (direct) return direct;
  }

  if (pNorm) {
    // Check fallback region map first (instant, zero network)
    for (const [regCode, provs] of Object.entries(FALLBACK_PROVINCES_BY_REGION)) {
      if (provs.some((p) => p.name.toLowerCase() === pNorm || pNorm.includes(p.name.toLowerCase()))) {
        const foundReg = list.find((r) => r.code === regCode);
        if (foundReg) return foundReg;
      }
    }
    // Check full PSGC province list if available
    try {
      const allProvs = await getProvinces();
      const matchedProv = allProvs.find((p) => p.name.toLowerCase() === pNorm);
      if (matchedProv?.regionCode) {
        const foundReg = list.find((r) => r.code === matchedProv.regionCode);
        if (foundReg) return foundReg;
      }
    } catch {}
  }

  return list[0];
}

/**
 * Returns all Philippine Provinces + Metro Manila (NCR) as the top-level option.
 */
export async function getProvinces(): Promise<GeoItem[]> {
  try {
    const rawProvinces = await fetchWithCache<GeoItem[]>(`${BASE_URL}/provinces.json`);
    const sorted = [...rawProvinces].sort((a, b) => a.name.localeCompare(b.name));
    const ncrItem: GeoItem = {
      code: '130000000',
      name: 'Metro Manila (NCR)',
      regionCode: '130000000',
    };
    return [ncrItem, ...sorted];
  } catch (err) {
    console.warn('PSGC API error loading provinces, falling back:', err);
    return [
      { code: '130000000', name: 'Metro Manila (NCR)', regionCode: '130000000' },
      { code: '045800000', name: 'Rizal', regionCode: '040000000' },
      { code: '031400000', name: 'Bulacan', regionCode: '030000000' },
      { code: '042100000', name: 'Cavite', regionCode: '040000000' },
      { code: '043400000', name: 'Laguna', regionCode: '040000000' },
      { code: '035400000', name: 'Pampanga', regionCode: '030000000' },
      { code: '041000000', name: 'Batangas', regionCode: '040000000' },
      { code: '015500000', name: 'Pangasinan', regionCode: '010000000' },
    ];
  }
}

/**
 * Returns all Cities and Municipalities for a given Province code, NCR region code (130000000),
 * or NCR District code (133900000, 137400000, 137500000, 137600000).
 */
export async function getCitiesMunicipalities(
  provinceOrDistrictCode: string,
  isDistrict?: boolean
): Promise<GeoItem[]> {
  const isNcrDistrict =
    isDistrict ||
    ['133900000', '137400000', '137500000', '137600000'].includes(provinceOrDistrictCode);

  try {
    let url: string;
    if (provinceOrDistrictCode === '130000000') {
      url = `${BASE_URL}/regions/130000000/cities-municipalities.json`;
    } else if (isNcrDistrict) {
      url = `${BASE_URL}/districts/${provinceOrDistrictCode}/cities-municipalities.json`;
    } else {
      url = `${BASE_URL}/provinces/${provinceOrDistrictCode}/cities-municipalities.json`;
    }
    const data = await fetchWithCache<GeoItem[]>(url);
    const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
    return sorted.length > 0 ? sorted : FALLBACK_CITIES_BY_CODE[provinceOrDistrictCode] || [];
  } catch (err) {
    console.warn(`PSGC API error loading cities for ${provinceOrDistrictCode}:`, err);
    return FALLBACK_CITIES_BY_CODE[provinceOrDistrictCode] || FALLBACK_CITIES_BY_CODE['130000000'] || [];
  }
}

/**
 * Returns all Barangays for a given City or Municipality code.
 */
export async function getBarangays(cityMunCode: string): Promise<GeoItem[]> {
  if (!cityMunCode) return [];
  if (FALLBACK_BARANGAYS_BY_CITY[cityMunCode] && cityMunCode.includes('_')) {
    return FALLBACK_BARANGAYS_BY_CITY[cityMunCode];
  }
  try {
    const url = `${BASE_URL}/cities-municipalities/${cityMunCode}/barangays.json`;
    const data = await fetchWithCache<GeoItem[]>(url);
    const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
    return sorted.length > 0
      ? sorted
      : FALLBACK_BARANGAYS_BY_CITY[cityMunCode] || [{ code: 'bgy_pob', name: 'Poblacion' }];
  } catch (err) {
    console.warn(`PSGC API error loading barangays for ${cityMunCode}:`, err);
    return FALLBACK_BARANGAYS_BY_CITY[cityMunCode] || [{ code: 'bgy_pob', name: 'Poblacion' }];
  }
}
