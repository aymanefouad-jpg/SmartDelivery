import { Delivery } from '../types';
import { scanETazkiraFront } from 'rn-af-identity-ocr';

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
    return result?.text || '';
  } catch (error) {
    console.error('OCR Error:', error);
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

export async function mockGeocode(address: string): Promise<{
  lat: number;
  lon: number;
}> {
  await sleep(500);
  const baseLat = 33.5731;
  const baseLon = -7.5898;
  const offset = 0.05;
  return {
    lat: baseLat + (Math.random() - 0.5) * offset * 2,
    lon: baseLon + (Math.random() - 0.5) * offset * 2,
  };
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

  const coords = await mockGeocode(address);

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