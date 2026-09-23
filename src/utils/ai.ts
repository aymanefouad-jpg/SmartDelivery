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
    const cleanAddress = address.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanAddress)}&format=json&limit=1&countrycodes=ma&accept-language=ar,fr,en&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AFD-Delivery-App/1.0',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      
      // Verify the result is in Morocco
      if (result.address && result.address.country_code && result.address.country_code !== 'ma') {
        return null;
      }

      return {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
      };
    }
    return null;
  } catch (error) {
    console.error('Nominatim error:', error);
    return null;
  }
};

export const processNewDeliveryFromPhoto = async (photoUri: string): Promise<Delivery> => {
  // Save the image to permanent storage
  let savedImagePath = photoUri;
  try {
    const fileName = `delivery_${Date.now()}.jpg`;
    const permanentPath = `${FileSystem.documentDirectory}deliveries/`;

    // Create directory if it doesn't exist
    const dirInfo = await FileSystem.getInfoAsync(permanentPath);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(permanentPath, { intermediates: true });
    }

    const newPath = `${permanentPath}${fileName}`;
    await FileSystem.copyAsync({ from: photoUri, to: newPath });
    savedImagePath = newPath;
  } catch {
    // Silent fallback: keep the original cache URI (low-end perf: no logs)
  }

  let extractedText: string | null = null;
  try {
    extractedText = await mockOCR(photoUri);

    if (!extractedText || extractedText.trim() === '') {
      throw new Error('لم يتم التعرف على أي نص من الصورة.');
    }

  // 1. Extract phone number (Moroccan format, tolerant to spaces/dots/dashes)
  const phoneMatch = extractedText.match(/(\+?212|0)[\s.\-]*[6-7](?:[\s.\-]*\d){8}/);
  const phone = phoneMatch ? phoneMatch[0].replace(/[\s.\-]/g, '') : 'غير معروف';

  // 2. Extract name (requested patterns) + next-line fallback.
  // ML Kit often puts the value on the line AFTER "Destinataire :" so a
  // same-line-only regex returns empty -> "غير معروف".
  let name = 'غير معروف';
  const namePatterns = [
    /Destinataire\s*:?\s*([^\n]+)/i,
    /Client\s*:?\s*([^\n]+)/i,
    /Nom\s*:?\s*([^\n]+)/i,
    /المرسل\s*إليه\s*:?\s*([^\n]+)/i,
    /الاسم\s*:?\s*([^\n]+)/i,
  ];
  const isJunkName = (s: string): boolean =>
    !s || /^[:;\-|_.,\s]+$/.test(s) || /^\d[\d\s/.\-]*$/.test(s) || s.length < 2;
  for (const pattern of namePatterns) {
    const match = extractedText.match(pattern);
    if (match && match[1] && !isJunkName(match[1].trim())) {
      name = match[1].trim().substring(0, 50);
      break;
    }
    // Fallback: label found but value on the next line
    // e.g. "Destinataire :\nAymane Fouad"
    if (match) {
      const labelOnly = new RegExp(pattern.source.replace(/\(\[\^\\n\]\+\)/, ''), 'i');
      const labelMatch = extractedText.match(labelOnly);
      if (labelMatch && labelMatch.index !== undefined) {
        const afterLabel = extractedText
          .slice(labelMatch.index + labelMatch[0].length)
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        const nextLine = afterLabel[0] || '';
        if (!isJunkName(nextLine)) {
          name = nextLine.substring(0, 50);
          break;
        }
      }
    }
  }

  // 3. Extract city from OCR text FIRST
  const cityResult = findCityInAddress(extractedText);
  const detectedCity = cityResult.city !== 'Unknown' ? cityResult.city : null;

  // 3. Try Nominatim with CITY + "Morocco" for accurate location
  let coords: { lat: number; lon: number } | null = null;

  if (detectedCity) {
    try {
      const cityQuery = `${detectedCity}, Morocco`;
      coords = await geocodeWithNominatim(cityQuery);
    } catch {
      // Silent fallback to city coords on low-end devices
    }
  }

  // 4. If Nominatim fails, use city coordinates from findCityInAddress
  if (!coords && cityResult.city !== 'Unknown') {
    coords = { lat: cityResult.lat, lon: cityResult.lon };
  }

  // 5. Last resort: Casablanca
  if (!coords) {
    coords = { lat: 33.5731, lon: -7.5898 };
  }

  // Address: prefer known Moroccan city, else first meaningful line
  // (skips dates / amounts / label headers so "09/0926" never becomes address).
  let address = 'غير معروف';
  // First, try to find a known Moroccan city
  const cityMatch = findCityInAddress(extractedText);
  if (cityMatch.city !== 'Unknown') {
    address = cityMatch.city;
  } else {
    // Otherwise, find lines that aren't dates/numbers/labels
    const lines = extractedText.split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) =>
        l.length > 3 &&
        l.length < 100 &&
        !/^\d+$/.test(l) &&
        !/\d{2}\/\d{2}\/\d{2,4}/.test(l) &&
        !/^\d{1,2}\/\d{3,4}$/.test(l) &&
        !/^\d+\s*(DH|MAD|درهم)$/i.test(l) &&
        !/DIGYLOG|Expéditeur|Destinataire|Hub|Commande|Order/i.test(l)
      );
    if (lines.length > 0) {
      address = lines[0].substring(0, 80);
    }
  }

  // FIX 2: persist the captured (compressed) image to permanent app storage
  // so the photo is saved instead of being discarded after OCR.
  const deliveryId = `delivery_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const delivery: Delivery = {
    id: `delivery_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    name: name || 'غير معروف',
    address,
    phone,
    latitude: coords.lat,
    longitude: coords.lon,
    order: 0,
    imagePath: savedImagePath,
  };
  return delivery;
  } finally {
    // Free OCR string immediately — don't keep image text in memory
    extractedText = null;
    photoUri = null as unknown as string;
  }
};

export async function mockOptimizeRoute(deliveries: Delivery[]): Promise<Delivery[]> {
  await sleep(800);
  const shuffled = [...deliveries].sort(() => Math.random() - 0.5);
  return shuffled.map((delivery, index) => ({
    ...delivery,
    order: index + 1,
  }));
}