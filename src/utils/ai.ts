import { Delivery } from '../types';
import { scanETazkiraFront } from 'rn-af-identity-ocr';
import { getCityByLabel } from 'country-city-multilanguage';
import recognizeText from '@react-native-ml-kit/text-recognition';

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
  try {
    const result = await scanETazkiraFront(photoUri);
    const resultText = (result as any)?.text;
    if (resultText) {
      return resultText;
    }
  } catch (error) {
    console.error('ID Card OCR Error:', error);
  }

  try {
    const mlResult = await recognizeText.recognize(photoUri);
    const mlText = (mlResult as any)?.text;
    if (mlText) {
      return mlText;
    }
  } catch (error) {
    console.error('ML Kit OCR Error:', error);
  }

  const mockAddresses = [
    'الدار البيضاء، شارع محمد الخامس، رقم 123',
    'الرباط، حي أكدال، زنقة 5، رقم 45',
    'مراكش، المدينة العتيقة، درب المشور، رقم 78',
    'فاس، Ville Nouvelle، شارع الحسن الثاني، رقم 200',
    'طنجة، ملاباطا، شارع الأمير مولاي رشيد، رقم 12',
    'أكادير، تالبرجت، زنقة ابن سينا، رقم 34',
    'مكناس، حميس، شارع الجيش الملكي، رقم 56',
    'وجدة، حي الجامعة، زنقة عبد الكريم الخطابي، رقم 89',
  ];
  return mockAddresses[Math.floor(Math.random() * mockAddresses.length)];
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

const MOROCCAN_CITIES: Record<string, { lat: number; lon: number }> = {
  casablanca: { lat: 33.5731, lon: -7.5898 },
  "الدار البيضاء": { lat: 33.5731, lon: -7.5898 },
  rabat: { lat: 34.0209, lon: -6.8416 },
  "الرباط": { lat: 34.0209, lon: -6.8416 },
  marrakech: { lat: 31.6295, lon: -7.9811 },
  "مراكش": { lat: 31.6295, lon: -7.9811 },
  fes: { lat: 34.0331, lon: -5.0003 },
  "فاس": { lat: 34.0331, lon: -5.0003 },
  fez: { lat: 34.0331, lon: -5.0003 },
  tangier: { lat: 35.7595, lon: -5.8340 },
  tanger: { lat: 35.7595, lon: -5.8340 },
  "طنجة": { lat: 35.7595, lon: -5.8340 },
  agadir: { lat: 30.4278, lon: -9.5981 },
  "أكادير": { lat: 30.4278, lon: -9.5981 },
  meknes: { lat: 33.8935, lon: -5.5473 },
  "مكناس": { lat: 33.8935, lon: -5.5473 },
  oujda: { lat: 34.6814, lon: -1.9086 },
  "وجدة": { lat: 34.6814, lon: -1.9086 },
  kenitra: { lat: 34.2610, lon: -6.5802 },
  "القنيطرة": { lat: 34.2610, lon: -6.5802 },
  tetouan: { lat: 35.5889, lon: -5.3626 },
  "تطوان": { lat: 35.5889, lon: -5.3626 },
  safi: { lat: 32.2994, lon: -9.2372 },
  "آسفي": { lat: 32.2994, lon: -9.2372 },
  "el jadida": { lat: 33.2316, lon: -8.5007 },
  "الجديدة": { lat: 33.2316, lon: -8.5007 },
  "beni mellal": { lat: 32.3373, lon: -6.3498 },
  "بني ملال": { lat: 32.3373, lon: -6.3498 },
  nador: { lat: 35.1681, lon: -2.9335 },
  "الناظور": { lat: 35.1681, lon: -2.9335 },
  settat: { lat: 33.0010, lon: -7.6166 },
  "سطات": { lat: 33.0010, lon: -7.6166 },
  larache: { lat: 35.1932, lon: -6.1557 },
  "العرائش": { lat: 35.1932, lon: -6.1557 },
  khouribga: { lat: 32.8815, lon: -6.9097 },
  "خريبكة": { lat: 32.8815, lon: -6.9097 },
  guelmin: { lat: 28.9870, lon: -10.0574 },
  "كلميم": { lat: 28.9870, lon: -10.0574 },
  laayoune: { lat: 27.1536, lon: -13.2033 },
  "العيون": { lat: 27.1536, lon: -13.2033 },
  dakhla: { lat: 23.7162, lon: -15.9347 },
  "الداخلة": { lat: 23.7162, lon: -15.9347 },
};

function findCityInAddress(address: string): { lat: number; lon: number } | null {
  const lowerAddress = address.toLowerCase();
  for (const [city, coords] of Object.entries(MOROCCAN_CITIES)) {
    if (lowerAddress.includes(city.toLowerCase())) {
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

  const realCoords = await geocodeAddress(address);
  let coords: { lat: number; lon: number };
  let usedReal = false;

  if (realCoords) {
    coords = realCoords;
    usedReal = true;
  } else {
    coords = await mockGeocode(address);
    usedReal = false;
  }

  console.log('Geocoding method:', usedReal ? 'Nominatim' : 'Mock');

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