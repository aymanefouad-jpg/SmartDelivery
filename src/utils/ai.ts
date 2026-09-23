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

    console.log('=== RAW OCR TEXT ===');
    console.log(extractedText);
    console.log('=== END RAW OCR TEXT ===');

    if (!extractedText || extractedText.trim() === '') {
      throw new Error('لم يتم التعرف على أي نص من الصورة.');
    }

  // 1. Extract phone number (Moroccan format, tolerant to spaces/dots/dashes)
  const phoneMatch = extractedText.match(/(\+?212|0)[\s.\-]*[6-7](?:[\s.\-]*\d){8}/);
  const phone = phoneMatch ? phoneMatch[0].replace(/[\s.\-]/g, '') : 'غير معروف';

  // Extract name - STRICT: only take the line AFTER "Destinataire"
  let name = 'غير معروف';
  const allLines = extractedText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);

  console.log('=== ALL LINES ===');
  allLines.forEach((l, i) => console.log(`[${i}] ${l}`));
  console.log('=== END LINES ===');

  // List of words that indicate a COMPANY name (to reject)
  const companyKeywords = /transport|messagerie|shop|digylog|exp[eé]diteur|rizal|hub|glo|commande|order|facture|invoice|tva|ice|rc|if|patente/i;

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];

    // Look for "Destinataire" (tolerant to OCR errors)
    if (/dest[il1]nat[ae]ir[ea]/i.test(line)) {
      // Case 1: name on the same line after ":"
      const sameLineMatch = line.match(/:\s*(.+)/);
      if (sameLineMatch && sameLineMatch[1].trim().length > 2) {
        const candidate = sameLineMatch[1].trim();
        if (!companyKeywords.test(candidate)) {
          name = candidate.substring(0, 50);
          console.log('Name found (same line):', name);
          break;
        }
      }

      // Case 2: name on the NEXT line
      if (i + 1 < allLines.length) {
        const nextLine = allLines[i + 1].trim();
        if (nextLine.length > 2 &&
            nextLine.length < 50 &&
            !/^\d+$/.test(nextLine) &&
            !companyKeywords.test(nextLine)) {
          name = nextLine.substring(0, 50);
          console.log('Name found (next line):', name);
          break;
        }
      }
    }
  }

  // If still not found, try Arabic label
  if (name === 'غير معروف') {
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      if (/المرسل\s*إليه|الاسم/i.test(line)) {
        const match = line.match(/:\s*(.+)/);
        if (match && match[1].trim().length > 2) {
          name = match[1].trim().substring(0, 50);
          break;
        }
        if (i + 1 < allLines.length) {
          const nextLine = allLines[i + 1].trim();
          if (nextLine.length > 2 && nextLine.length < 50) {
            name = nextLine.substring(0, 50);
            break;
          }
        }
      }
    }
  }

  console.log('=== FINAL NAME:', name, '===');

  // 3. Try Nominatim FIRST with the detected city
  const detected = findCityInAddress(extractedText);
  let coords: { lat: number; lon: number } | null = null;
  let geocodeSource = 'none';

  if (detected.city !== 'Unknown') {
    // Use the city name (not the full text) for Nominatim
    coords = await geocodeWithNominatim(`${detected.city}, Morocco`);
    if (coords) {
      geocodeSource = `nominatim-city-${detected.city}`;
    } else {
      // Fallback: use the city's hardcoded coordinates
      coords = { lat: detected.lat, lon: detected.lon };
      geocodeSource = `city-fallback-${detected.city}`;
    }
  } else {
    // No city detected, try Nominatim with the full text
    const fullTextClean = extractedText.replace(/\n/g, ' ').substring(0, 200);
    coords = await geocodeWithNominatim(fullTextClean);
    if (coords) {
      geocodeSource = 'nominatim-full';
    } else {
      coords = { lat: 33.5731, lon: -7.5898 };
      geocodeSource = 'fallback-casablanca';
    }
  }

  console.log('Geocode source:', geocodeSource);
  console.log('Final coords:', coords);

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

export const mockOptimizeRoute = async (deliveries: Delivery[]): Promise<Delivery[]> => {
  if (deliveries.length < 2) return deliveries;

  // Sort by city (group same-city deliveries together)
  // If no city, keep original order
  const sorted = [...deliveries].sort((a, b) => {
    const aAddr = (a.arabicAddress || a.address || '').toLowerCase();
    const bAddr = (b.arabicAddress || b.address || '').toLowerCase();

    // Extract city-like words
    const aCity = aAddr.match(/tanger|tangier|طنجة|casablanca|الدار البيضاء|rabat|الرباط|fes|فاس|marrakech|مراكش|agadir|أكادير/i)?.[0] || '';
    const bCity = bAddr.match(/tanger|tangier|طنجة|casablanca|الدار البيضاء|rabat|الرباط|fes|فاس|marrakech|مراكش|agadir|أكادير/i)?.[0] || '';

    return aCity.localeCompare(bCity);
  });

  // Assign order numbers
  return sorted.map((d, index) => ({ ...d, order: index + 1 }));
};