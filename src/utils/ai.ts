import { Delivery } from '../types';
import { scanETazkiraFront } from 'rn-af-identity-ocr';
import { getCityByLabel } from 'country-city-multilanguage';
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
  let combinedText = '';
  
  // Strategy 1: Default (Latin script)
  try {
    const latinResult = await TextRecognition.recognize(photoUri);
    if (latinResult?.text) {
      combinedText += latinResult.text + '\n';
      console.log('Latin OCR:', latinResult.text);
    }
  } catch (e) {
    console.log('Latin OCR failed:', e);
  }

  // Strategy 2: Arabic script
  try {
    const arabicResult = await TextRecognition.recognize(photoUri, {
      script: 'Arabic',
    });
    if (arabicResult?.text) {
      combinedText += arabicResult.text + '\n';
      console.log('Arabic OCR:', arabicResult.text);
    }
  } catch (e) {
    console.log('Arabic OCR failed:', e);
  }

  console.log('Combined OCR Result:', combinedText);
  return combinedText.trim();
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

function findCityInAddress(address: string): { lat: number; lon: number } | null {
  for (const [city, coords] of Object.entries(cityMap)) {
    if (address.includes(city)) {
      console.log(`Found city in address: ${city}`);
      return coords;
    }
  }
  return null;
}

export async function mockGeocode(address: string): Promise<{
  lat: number;
  lon: number;
}> {
  await sleep(500);
  
  const cityCoords = findCityInAddress(address);
  if (cityCoords) {
    const offset = 0.03;
    return {
      lat: cityCoords.lat + (Math.random() - 0.5) * offset * 2,
      lon: cityCoords.lon + (Math.random() - 0.5) * offset * 2,
    };
  }

  try {
    const cityData = getCityByLabel('MA');
    if (cityData && cityData.length > 0) {
      for (const city of cityData) {
        if (address.toLowerCase().includes(city.label.toLowerCase())) {
          const offset = 0.03;
          return {
            lat: city.latitude + (Math.random() - 0.5) * offset * 2,
            lon: city.longitude + (Math.random() - 0.5) * offset * 2,
          };
        }
      }
    }
  } catch (error) {
    console.log('country-city-multilanguage lookup failed:', error);
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

export const processNewDeliveryFromPhoto = async (photoUri: string): Promise<Delivery> => {
  const extractedText = await mockOCR(photoUri);
  console.log('OCR Result:', extractedText);

  const phoneMatch = extractedText.match(/(\+?212|0)\s?[6-7](\s?\d{2}){4}/);
  const phone = phoneMatch ? phoneMatch[0].trim() : 'غير معروف';

  const nameMatch = extractedText.match(/(?:Destinataire|المرسل إليه|Client)[:\s]+([^\n]+)/i);
  const name = nameMatch ? nameMatch[1].trim() : 'غير معروف';

  const addressMatch = extractedText.match(/(?:Adresse|العنوان)[:\s]+([^\n]+)/i);
  const address = addressMatch ? addressMatch[1].trim() : extractedText.slice(0, 100);

  const cityCoords = findCityInAddress(extractedText);
  let coords: { lat: number; lon: number };
  let geocodeMethod = 'Mock';

  if (cityCoords) {
    coords = cityCoords;
    geocodeMethod = 'CityDetection';
    console.log('Using city coordinates from OCR text');
  } else {
    const realCoords = await geocodeAddress(address);
    if (realCoords) {
      coords = realCoords;
      geocodeMethod = 'Nominatim';
    } else {
      coords = await mockGeocode(address);
      geocodeMethod = 'Mock';
    }
  }

  console.log('Geocoding method:', geocodeMethod);

  return {
    id: `delivery_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    name,
    address,
    phone,
    latitude: coords.lat,
    longitude: coords.lon,
    order: 0,
  };
}

export async function mockOptimizeRoute(deliveries: Delivery[]): Promise<Delivery[]> {
  await sleep(800);
  const shuffled = [...deliveries].sort(() => Math.random() - 0.5);
  return shuffled.map((delivery, index) => ({
    ...delivery,
    order: index + 1,
  }));
}