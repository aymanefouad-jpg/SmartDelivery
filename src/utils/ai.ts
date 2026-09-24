import { Delivery } from '../types';
import TextRecognition from '@react-native-ml-kit/text-recognition';
// NOTE: expo-file-system v57 moved copyAsync/documentDirectory to /legacy —
// the package root only exports the new File/Directory API (no copy).
import * as FileSystem from 'expo-file-system/legacy';

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

/**
 * Geocode an address using Nominatim (OpenStreetMap) - FREE, no API key required.
 * Restricted to Morocco for accuracy.
 */
export const geocodeWithNominatim = async (address: string): Promise<{ lat: number; lon: number } | null> => {
  if (!address || address.trim().length < 3) {
    return null;
  }

  try {
    // Clean and normalize the address
    const cleanAddress = address.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Add "Morocco" if not present
    const query = cleanAddress.toLowerCase().includes('morocco') || cleanAddress.includes('المغرب')
      ? cleanAddress
      : `${cleanAddress}, Morocco`;

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=ma&accept-language=ar,fr,en&addressdetails=1`;
    
    console.log('Nominatim URL:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AFD-Delivery-App/1.0',
      },
    });

    if (!response.ok) {
      console.log('Nominatim HTTP error:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('Nominatim result:', JSON.stringify(data).substring(0, 300));

    if (data && data.length > 0) {
      const result = data[0];
      
      // Verify the result is in Morocco
      if (result.address && result.address.country_code && result.address.country_code !== 'ma') {
        console.log('Result not in Morocco, ignoring.');
        return null;
      }

      console.log('Nominatim coords:', result.lat, result.lon);
      return {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
      };
    }
    console.log('Nominatim returned no results');
    return null;
  } catch (error) {
    console.error('Nominatim error:', error);
    return null;
  }
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

  // 2. Run OCR
  const extractedText = await mockOCR(photoUri);
  console.log('=== RAW OCR TEXT ===');
  console.log(extractedText);
  console.log('=== END OCR ===');

  // 3. Extract lines
  const lines = extractedText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
  console.log('=== LINES ===');
  lines.forEach((l, i) => console.log(`[${i}] ${l}`));
  console.log('=== END LINES ===');

  // 4. Extract NAME
  let name = 'غير معروف';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/dest[il1]nat[ae]ir[ea]/i.test(line)) {
      // Same line
      const sameLineMatch = line.match(/:\s*(.+)/);
      if (sameLineMatch && sameLineMatch[1].trim().length > 2) {
        name = sameLineMatch[1].trim().substring(0, 50);
        break;
      }
      // Next line
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.length > 2 && nextLine.length < 50) {
          name = nextLine.substring(0, 50);
          break;
        }
      }
    }
  }
  // If still unknown, look for a name-like line (Capitalized words, not labels)
  if (name === 'غير معروف') {
    for (const line of lines) {
      if (line.length > 3 &&
          line.length < 40 &&
          !/^\d+$/.test(line) &&
          !/exp[eé]diteur|dest[il1]nat|hub|digylog|commande|order|dh|mad|درهم|tanger|طنجة/i.test(line) &&
          (/[A-Z][a-z]+\s+[A-Z][a-z]+/.test(line) || /[\u0600-\u06FF]{3,}/.test(line))) {
        name = line.substring(0, 50);
        break;
      }
    }
  }
  console.log('=== NAME:', name, '===');

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

  return {
    id: `delivery_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    name,
    address,
    phone,
    latitude: detected.lat,
    longitude: detected.lon,
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

export const mockOptimizeRoute = async (deliveries: Delivery[]): Promise<Delivery[]> => {
  if (deliveries.length < 2) {
    return deliveries.map((d, i) => ({ ...d, order: i + 1 }));
  }

  // Enrich deliveries with coordinates
  const enriched = deliveries.map((d) => {
    if (d.latitude && d.longitude) return d;
    const detected = findCityInAddress(d.arabicAddress || d.address || '');
    return { ...d, latitude: detected.lat, longitude: detected.lon };
  });

  const remaining = [...enriched];
  const sorted: Delivery[] = [];

  // Start from the first delivery
  const start = remaining.shift()!;
  sorted.push(start);

  // Nearest-Neighbor loop
  while (remaining.length > 0) {
    const last = sorted[sorted.length - 1];
    const lastLat = last.latitude || 0;
    const lastLon = last.longitude || 0;

    let closestIndex = 0;
    let closestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const distance = calculateDistance(
        lastLat,
        lastLon,
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
  }

  return sorted.map((d, i) => ({ ...d, order: i + 1 }));
};