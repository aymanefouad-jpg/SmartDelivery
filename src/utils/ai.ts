import { Delivery } from '../types';
import TextRecognition from '@react-native-ml-kit/text-recognition';
// NOTE: expo-file-system v57 moved copyAsync/documentDirectory to /legacy —
// the package root only exports the new File/Directory API (no copy).
import * as FileSystem from 'expo-file-system/legacy';
import { analyzeImageWithGemini } from './geminiAI';

const MOCK_ADDRESSES = [
  'الدار البيضاء، شارع محمد الخامس، رقم 123',
  'الرباط، حي أكدال، زنقة 5، رقم 45',
  'مراكش، المدينة العتيقة، درب المشور، رقم 78',
  'فاس، Ville Nouvelle، شارع الحسن الثاني، رقم 200',
  'طنجة، ملاباطا، شارع الأمير مولاي رشيد، رقم 12',
  'أكادير، تالبرجت، زنقة ابن سينا، رقم 34',
  'مكناس، حميس، شارع الجيش الملكي، رقم 56',
  'وجدة، حي الجامعة، زنقة عبد الكريم الخطابي، رقم 89',
];

const MOCK_NAMES = [
  'أحمد بن علي',
  'فاطمة الزهراء',
  'محمد الإدريسي',
  'خديجة بناني',
  'يوسف المرنيسي',
  'نعيمة التهامي',
  'كريم بن شقرون',
  'سارة الفيلالي',
  'عمر بناني',
  'ليلى القاسمي',
];

const MOCK_PHONES = [
  '+212 6 12 34 56 78',
  '+212 6 23 45 67 89',
  '+212 6 34 56 78 90',
  '+212 6 45 67 89 01',
  '+212 6 56 78 90 12',
  '+212 6 67 89 01 23',
  '+212 6 78 90 12 34',
  '+212 6 89 01 23 45',
  '+212 6 90 12 34 56',
  '+212 6 01 23 45 67',
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const mockOCR = async (photoUri: string): Promise<string> => {
  let result: { text?: string } | null = null;
  let rawText: string | null = null;
  let truncated: string | null = null;
  try {
    // Use Promise.race for timeout - max 5 seconds
    result = await Promise.race([
      TextRecognition.recognize(photoUri),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OCR timeout')), 5000)
      )
    ]);
    rawText = result?.text || '';
    // Limit OCR text to 1000 chars max to avoid huge strings in memory
    truncated = rawText.length > 1000 ? rawText.substring(0, 1000) : rawText;
    return truncated;
  } catch {
    return '';
  } finally {
    // Explicitly free references for low-memory devices
    result = null;
    rawText = null;
    truncated = null;
    photoUri = null as unknown as string;
  }
};

export async function mockExtractData(): Promise<{
  name: string;
  address: string;
  phone: string;
}> {
  await sleep(1000);
  return {
    name: getRandomElement(MOCK_NAMES),
    address: getRandomElement(MOCK_ADDRESSES),
    phone: getRandomElement(MOCK_PHONES),
  };
}

const cityMap: Record<string, { lat: number; lon: number }> = {
  // Arabic names
  'طنجة': { lat: 35.7595, lon: -5.8340 },
  'الرباط': { lat: 34.0209, lon: -6.8416 },
  'الدار البيضاء': { lat: 33.5731, lon: -7.5898 },
  'فاس': { lat: 34.0331, lon: -5.0003 },
  'مراكش': { lat: 31.6295, lon: -7.9811 },
  'أكادير': { lat: 30.4278, lon: -9.5981 },
  'مكناس': { lat: 33.8935, lon: -5.5473 },
  'وجدة': { lat: 34.6867, lon: -1.9114 },
  'تطوان': { lat: 35.5785, lon: -5.3684 },
  'القنيطرة': { lat: 34.2610, lon: -6.5802 },
  'سلا': { lat: 34.0531, lon: -6.7985 },
  'الجديدة': { lat: 33.2316, lon: -8.5007 },
  'بني ملال': { lat: 32.3373, lon: -6.3498 },
  'الناظور': { lat: 35.1681, lon: -2.9287 },
  'خريبكة': { lat: 32.8811, lon: -6.9063 },
  // Latin names (uppercase + lowercase)
  'TANGER': { lat: 35.7595, lon: -5.8340 },
  'tanger': { lat: 35.7595, lon: -5.8340 },
  'tangier': { lat: 35.7595, lon: -5.8340 },
  'tangiers': { lat: 35.7595, lon: -5.8340 },
  'RABAT': { lat: 34.0209, lon: -6.8416 },
  'rabat': { lat: 34.0209, lon: -6.8416 },
  'CASABLANCA': { lat: 33.5731, lon: -7.5898 },
  'casablanca': { lat: 33.5731, lon: -7.5898 },
  'FES': { lat: 34.0331, lon: -5.0003 },
  'fes': { lat: 34.0331, lon: -5.0003 },
  'MARRAKECH': { lat: 31.6295, lon: -7.9811 },
  'marrakech': { lat: 31.6295, lon: -7.9811 },
  'AGADIR': { lat: 30.4278, lon: -9.5981 },
  'agadir': { lat: 30.4278, lon: -9.5981 },
  'MEKNES': { lat: 33.8935, lon: -5.5473 },
  'meknes': { lat: 33.8935, lon: -5.5473 },
  'OUJDA': { lat: 34.6867, lon: -1.9114 },
  'oujda': { lat: 34.6867, lon: -1.9114 },
  'TETOUAN': { lat: 35.5785, lon: -5.3684 },
  'tetouan': { lat: 35.5785, lon: -5.3684 },
};

export const findCityInAddress = (text: string): { lat: number; lon: number; city: string } => {
  if (!text) {
    return { lat: 33.5731, lon: -7.5898, city: 'Unknown' };
  }

  const cityMap: Record<string, { lat: number; lon: number }> = {
    'طنجة': { lat: 35.7595, lon: -5.8340 },
    'tanger': { lat: 35.7595, lon: -5.8340 },
    'tangier': { lat: 35.7595, lon: -5.8340 },
    'tangiers': { lat: 35.7595, lon: -5.8340 },
    'طنجه': { lat: 35.7595, lon: -5.8340 },
    'الرباط': { lat: 34.0209, lon: -6.8416 },
    'rabat': { lat: 34.0209, lon: -6.8416 },
    'الدار البيضاء': { lat: 33.5731, lon: -7.5898 },
    'casablanca': { lat: 33.5731, lon: -7.5898 },
    'فاس': { lat: 34.0331, lon: -5.0003 },
    'fes': { lat: 34.0331, lon: -5.0003 },
    'مراكش': { lat: 31.6295, lon: -7.9811 },
    'marrakech': { lat: 31.6295, lon: -7.9811 },
    'أكادير': { lat: 30.4278, lon: -9.5981 },
    'agadir': { lat: 30.4278, lon: -9.5981 },
    'مكناس': { lat: 33.8935, lon: -5.5473 },
    'meknes': { lat: 33.8935, lon: -5.5473 },
    'وجدة': { lat: 34.6867, lon: -1.9114 },
    'oujda': { lat: 34.6867, lon: -1.9114 },
    'تطوان': { lat: 35.5785, lon: -5.3684 },
    'tetouan': { lat: 35.5785, lon: -5.3684 },
    'القنيطرة': { lat: 34.2610, lon: -6.5802 },
    'kenitra': { lat: 34.2610, lon: -6.5802 },
    'سلا': { lat: 34.0531, lon: -6.7985 },
    'sale': { lat: 34.0531, lon: -6.7985 },
    'الجديدة': { lat: 33.2316, lon: -8.5007 },
    'el jadida': { lat: 33.2316, lon: -8.5007 },
  };

  const lowerText = text.toLowerCase();
  for (const [cityName, coords] of Object.entries(cityMap)) {
    if (lowerText.includes(cityName.toLowerCase())) {
      return { ...coords, city: cityName };
    }
  }
  return { lat: 33.5731, lon: -7.5898, city: 'Unknown' };
};

export async function mockGeocode(address: string): Promise<{
  lat: number;
  lon: number;
}> {
  await sleep(200);
  
  const cityCoords = findCityInAddress(address);
  if (cityCoords) {
    const offset = 0.03;
    return {
      lat: cityCoords.lat + (Math.random() - 0.5) * offset * 2,
      lon: cityCoords.lon + (Math.random() - 0.5) * offset * 2,
    };
  }

  const baseLat = 33.5731;
  const baseLon = -7.5898;
  const offset = 0.05;
  return {
    lat: baseLat + (Math.random() - 0.5) * offset * 2,
    lon: baseLon + (Math.random() - 0.5) * offset * 2,
  };
}

export async function geocodeAddress(address: string): Promise<{
  lat: number;
  lon: number;
} | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AFD-Delivery-App',
      },
    });
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error('Nominatim geocoding error:', error);
    return null;
  }
}

// Longest we wait for a single Nominatim reply. Kept short so a slow network
// cannot freeze the "add delivery" / "open route" flow.
const NOMINATIM_TIMEOUT_MS = 5000;

// If the geocoder answers with a point farther than this from the detected
// city centre, the answer belongs to another city (e.g. "شارع محمد الخامس
// طنجة" resolved to Al Hoceima in testing). Reject it instead of routing
// the driver 180 km away.
const MAX_DISTANCE_FROM_CITY_KM = 45;

interface NominatimResult {
  lat: string;
  lon: string;
}

const fetchNominatim = async (query: string): Promise<{ lat: number; lon: number } | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      `${query}, Morocco`
    )}&format=json&limit=1&countrycodes=ma&accept-language=ar,fr,en`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'AFD-Delivery-App/1.0' },
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = (await response.json()) as NominatimResult[];
    if (!Array.isArray(data) || data.length === 0) return null;

    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    return { lat, lon };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Resolve a delivery address to real coordinates with Nominatim (free, no key).
 *
 * Short neighbourhood names alone ("كزناية") resolve well, but long OCR text
 * ("فرساي كزناية طنجة") often returns nothing, so we retry after dropping the
 * first one or two words. Every answer is checked against the detected city
 * centre; wrong-city matches are discarded and the next query is tried.
 *
 * Returns null when nothing trustworthy was found — callers then fall back to
 * the city-centre coordinates from findCityInAddress.
 */
export const geocodeWithNominatim = async (
  address: string
): Promise<{ lat: number; lon: number } | null> => {
  if (!address) return null;

  const clean = address
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/,?\s*(morocco|maroc|المغرب)\s*$/i, '')
    .trim();

  if (clean.length < 3) return null;

  const city = findCityInAddress(clean);
  const hasKnownCity = city.city !== 'Unknown';

  // Full address first, then progressively shorter neighbourhood/city forms.
  const tokens = clean.split(' ').filter(Boolean);
  const queries = [clean];
  for (let drop = 1; drop <= 2; drop++) {
    if (tokens.length - drop >= 2) {
      queries.push(tokens.slice(drop).join(' '));
    }
  }

  for (const query of queries) {
    const result = await fetchNominatim(query);
    if (!result) continue;

    if (
      hasKnownCity &&
      calculateDistance(city.lat, city.lon, result.lat, result.lon) >
        MAX_DISTANCE_FROM_CITY_KM
    ) {
      continue;
    }

    return result;
  }

  return null;
};

export const processNewDeliveryFromPhoto = async (photoUri: string): Promise<Delivery> => {
  console.log('=== processNewDeliveryFromPhoto START ===');

  // 1. Save image permanently
  let savedImagePath = photoUri;
  try {
    const fileName = `delivery_${Date.now()}.jpg`;
    const permanentPath = `${FileSystem.documentDirectory}deliveries/`;
    const dirInfo = await FileSystem.getInfoAsync(permanentPath);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(permanentPath, { intermediates: true });
    }
    const newPath = `${permanentPath}${fileName}`;
    await FileSystem.copyAsync({ from: photoUri, to: newPath });
    savedImagePath = newPath;
  } catch (error) {
    console.error('Failed to save image:', error);
  }

  // 2. Try cloud extraction first (Gemini reads Arabic + French labels far
  //    better than on-device ML Kit).
  const geminiData = await analyzeImageWithGemini(photoUri);

  if (geminiData) {
    const detected = findCityInAddress(`${geminiData.city} ${geminiData.address}`.trim());
    const address =
      geminiData.address ||
      geminiData.city ||
      (detected.city !== 'Unknown' ? detected.city : 'غير معروف');

    // Prefer real coordinates; fall back to the city centre when the free
    // geocoder has no trustworthy answer.
    const geocoded =
      address !== 'غير معروف' ? await geocodeWithNominatim(address) : null;

    return {
      id: `delivery_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: geminiData.name || 'غير معروف',
      address,
      phone: geminiData.phone || 'غير معروف',
      latitude: geocoded?.lat ?? detected.lat,
      longitude: geocoded?.lon ?? detected.lon,
      order: 0,
      status: 'NEW',
      imagePath: savedImagePath,
    };
  }

  // 3. Fallback: on-device ML Kit OCR (also works offline / without a key).
  const extractedText = await mockOCR(photoUri);
  console.log('=== RAW OCR TEXT ===');
  console.log(extractedText);
  console.log('=== END OCR ===');

  if (!extractedText || extractedText.trim().length < 5) {
    console.log('OCR returned empty or too short');
    // Still return a delivery with the image, but unknown data
    return {
      id: `delivery_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: 'غير معروف',
      address: 'غير معروف',
      phone: 'غير معروف',
      latitude: 0,
      longitude: 0,
      order: 0,
      status: 'NEW',
      imagePath: savedImagePath,
    };
  }

  // 3. Extract lines
  const lines = extractedText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
  console.log('=== LINES ===');
  lines.forEach((l, i) => console.log(`[${i}] ${l}`));
  console.log('=== END LINES ===');

  // Extract name - simple and reliable
  let name = 'غير معروف';
  const allLines = extractedText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);

  console.log('=== NAME EXTRACTION ===');
  console.log('Total lines:', allLines.length);

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];

    // VERY tolerant match for "Destinataire" (handles i→l, i→1, etc.)
    const isDestinataireLine = /dest.{1,3}nat.{0,3}r/i.test(line);

    if (isDestinataireLine) {
      console.log('  ✓ Found Destinataire (tolerant match)');

      // Case 1: Name on same line after ":"
      const sameLine = line.match(/:\s*(.+)/);
      if (sameLine && sameLine[1].trim().length > 2) {
        name = sameLine[1].trim().replace(/[^\p{L}\s]/gu, '').substring(0, 50);
        console.log('  ✓ Name from same line:', name);
        break;
      }

      // Case 2: Name on next line
      if (i + 1 < allLines.length) {
        const nextLine = allLines[i + 1].trim();
        // Clean the name: keep only letters and spaces
        const cleanName = nextLine.replace(/[^\p{L}\s]/gu, '').trim();
        if (cleanName.length > 2 && cleanName.length < 50) {
          name = cleanName.substring(0, 50);
          console.log('  ✓ Name from next line:', name);
          break;
        }
      }
    }
  }

  // Fallback: any line with a capitalized name pattern (2+ words)
  if (name === 'غير معروف') {
    console.log('  → Trying fallback...');
    for (const line of allLines) {
      // A name is typically: 2+ words with capitalized letters, and NOT a label
      const words = line.split(/\s+/).filter(w => w.length > 1);
      const isLabel = /exp[eé]diteur|dest[il1]nat|hub|digylog|commande|order|facture|invoice|transport|messagerie|messager|shop|rizal|dh|mad|درهم|tanger|طنجة|maroc|morocco/i.test(line);

      if (words.length >= 2 &&
          words.length <= 4 &&
          line.length > 4 &&
          line.length < 40 &&
          !isLabel &&
          /[A-Z]/.test(line)) {
        name = line.substring(0, 50);
        console.log('  ✓ Name from fallback:', name);
        break;
      }
    }
  }

  console.log('=== FINAL NAME:', name, '===');

  // 5. Extract PHONE (Moroccan format: 06XXXXXXXX, 07XXXXXXXX, +2126..., +2127...)
  let phone = 'غير معروف';
  const phonePatterns = [
    /(\+212|00212)\s?[67]\d{8}/,
    /\b0[67]\d{8}\b/,
    /(\+212|00212)\s?[67](\s?\d{2}){4}/,
    /\b0[67](\s?\d{2}){4}\b/,
  ];
  for (const pattern of phonePatterns) {
    const match = extractedText.match(pattern);
    if (match) {
      phone = match[0].replace(/\s/g, '');
      break;
    }
  }
  console.log('=== PHONE:', phone, '===');

  // 6. Extract ADDRESS (city detection)
  const detected = findCityInAddress(extractedText);
  let address = 'غير معروف';

  if (detected.city !== 'Unknown') {
    address = detected.city;
  } else {
    // Look for a line that isn't a label, number, or date
    for (const line of lines) {
      if (line.length > 3 &&
          line.length < 80 &&
          !/^\d+$/.test(line) &&
          !/\d{2}\/\d{2}\/\d{2,4}/.test(line) &&
          !/^\d+\s*(DH|MAD|درهم)$/i.test(line) &&
          !/digylog|exp[eé]diteur|dest[il1]nat|hub|commande|order/i.test(line)) {
        address = line.substring(0, 80);
        break;
      }
    }
  }
  console.log('=== ADDRESS:', address, '===');
  console.log('=== CITY DETECTED:', detected.city, 'COORDS:', detected.lat, detected.lon, '===');

  const geocoded =
    address !== 'غير معروف' ? await geocodeWithNominatim(address) : null;

  return {
    id: `delivery_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    name,
    address,
    phone,
    latitude: geocoded?.lat ?? detected.lat,
    longitude: geocoded?.lon ?? detected.lon,
    order: 0,
    status: 'NEW',
    imagePath: savedImagePath,
  };
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const mockOptimizeRoute = async (
  deliveries: Delivery[],
  startLocation?: { lat: number; lon: number } | null
): Promise<Delivery[]> => {
  if (deliveries.length < 2) {
    return deliveries.map((d, i) => ({ ...d, order: i + 1 }));
  }

  // Enrich deliveries with coordinates
  const enriched = deliveries.map((d) => {
    if (d.latitude && d.longitude && d.latitude !== 0 && d.longitude !== 0) return d;
    const detected = findCityInAddress(d.arabicAddress || d.address || '');
    return { ...d, latitude: detected.lat, longitude: detected.lon };
  });

  const remaining = [...enriched];
  const sorted: Delivery[] = [];

  // Starting point: user's location OR the first delivery
  let currentLat: number;
  let currentLon: number;

  if (startLocation) {
    console.log('Starting from user location:', startLocation);
    currentLat = startLocation.lat;
    currentLon = startLocation.lon;
  } else {
    // Fallback: start from the first delivery
    const start = remaining.shift()!;
    sorted.push(start);
    currentLat = start.latitude || 0;
    currentLon = start.longitude || 0;
    console.log('Starting from first delivery (no user location available)');
  }

  // Nearest-Neighbor loop
  while (remaining.length > 0) {
    let closestIndex = 0;
    let closestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const distance = calculateDistance(
        currentLat,
        currentLon,
        candidate.latitude || 0,
        candidate.longitude || 0
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }

    const closest = remaining.splice(closestIndex, 1)[0];
    sorted.push(closest);
    currentLat = closest.latitude || 0;
    currentLon = closest.longitude || 0;
  }

  return sorted.map((d, i) => ({ ...d, order: i + 1 }));
};