import { Delivery } from '../types';
import TextRecognition from '@react-native-ml-kit/text-recognition';

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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const result = await TextRecognition.recognize(photoUri);
    clearTimeout(timeoutId);
    console.log('OCR Result:', result?.text || '');
    return result?.text || '';
  } catch (error) {
    clearTimeout(timeoutId);
    console.log('OCR failed or timed out:', error);
    return '';
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
      console.log('City detected:', cityName);
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
    
    console.log('Nominatim query:', url);

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
        console.log('Nominatim result is not in Morocco, ignoring.');
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
  const extractedText = await mockOCR(photoUri);

  if (!extractedText || extractedText.trim() === '') {
    throw new Error('لم يتم التعرف على أي نص من الصورة.');
  }

  // 1. Extract phone number (Moroccan format)
  const phoneMatch = extractedText.match(/(\+?212|0)\s?[6-7](\s?\d{2}){4}/);
  const phone = phoneMatch ? phoneMatch[0].replace(/\s/g, '') : 'غير معروف';

  // 2. Extract name
  let name = 'غير معروف';
  const namePatterns = [
    /(?:Destinataire|المرسل إليه)[:\s]+([^\n]+)/i,
    /(?:Client|Nom|الاسم)[:\s]+([^\n]+)/i,
  ];
  for (const pattern of namePatterns) {
    const match = extractedText.match(pattern);
    if (match && match[1]) {
      name = match[1].trim().substring(0, 30);
      break;
    }
  }

  // 3. Try Nominatim FIRST with the full text
  let coords: { lat: number; lon: number } | null = null;
  let geocodeSource = 'none';

  const fullTextClean = extractedText.replace(/\n/g, ' ').substring(0, 200);
  try {
    coords = await geocodeWithNominatim(fullTextClean);
    if (coords) {
      geocodeSource = 'nominatim-full';
    }
  } catch (error) {
    console.error('Geocode with Nominatim failed:', error);
  }

  // 4. If Nominatim fails, try city detection
  if (!coords) {
    try {
      const detected = findCityInAddress(extractedText);
      coords = { lat: detected.lat, lon: detected.lon };
      geocodeSource = `city-detection-${detected.city}`;
    } catch (error) {
      console.error('City detection failed:', error);
    }
  }

  const address = extractedText.split('\n')[0].substring(0, 80) || 'غير معروف';

  console.log('Geocode source:', geocodeSource);
  console.log('Final coords:', coords);

  return {
    id: `delivery_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    name,
    address,
    phone,
    latitude: coords ? coords.lat : null,
    longitude: coords ? coords.lon : null,
    order: 0,
  };
};

export async function mockOptimizeRoute(deliveries: Delivery[]): Promise<Delivery[]> {
  await sleep(800);
  const shuffled = [...deliveries].sort(() => Math.random() - 0.5);
  return shuffled.map((delivery, index) => ({
    ...delivery,
    order: index + 1,
  }));
}