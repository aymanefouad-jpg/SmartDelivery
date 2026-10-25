// Cloud OCR + field extraction with Google Gemini.
// Used as the primary extractor (Arabic + French labels); ai.ts falls back to
// the local ML Kit pipeline when this returns null.
// NOTE: expo-file-system v57 moved readAsStringAsync to /legacy (the package
// root only exports the new File/Directory API).
import * as FileSystem from 'expo-file-system/legacy';

// Expo inlines EXPO_PUBLIC_* at bundle time. Declared locally so `tsc` passes
// even before Expo generates the (gitignored) expo-env.d.ts file.
declare const process: {
  env: {
    EXPO_PUBLIC_GEMINI_API_KEY?: string;
    EXPO_PUBLIC_GEMINI_MODEL?: string;
  };
};

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

// gemini-1.5/2.0/2.5 Flash are retired for new keys. As of Oct 2026 the
// stable vision model with free capacity is 3.5 Flash Lite; override with
// EXPO_PUBLIC_GEMINI_MODEL if you want a newer Flash model.
const DEFAULT_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.5-flash-lite';
const MODEL_FALLBACKS = [
  DEFAULT_MODEL,
  'gemini-3.8-flash',
  'gemini-flash-latest',
];
const REQUEST_TIMEOUT_MS = 25000;

export interface ExtractedData {
  name: string;
  address: string;
  phone: string;
  city: string;
}

interface GeminiPart {
  text?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
}

const buildUrl = (model: string): string =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

const PROMPT = `You are reading a Moroccan delivery label (Arabic and/or French).
Extract these fields:
1. "name": recipient full name (after "Destinataire", "المرسل إليه", "الاسم", or the customer block). Do NOT include labels, company names, or phone numbers.
2. "address": full delivery address exactly as written (keep Arabic and Latin text, street, neighbourhood, city).
3. "phone": Moroccan phone number (06/07 or +212...).
4. "city": city name (e.g. Tanger, Casablanca, طنجة).

Rules:
- Return ONLY a JSON object with exactly these four string keys.
- If a field is not present, use "" (empty string). Never invent data.
- Keep Arabic text in Arabic and French text in French.

Example: {"name": "حسن العلمي", "address": "فرساي كزناية طنجة", "phone": "0612345678", "city": "طنجة"}`;

const parseJsonObject = (text: string): unknown => {
  if (!text) return null;

  // Models occasionally wrap JSON in ```json fences despite responseMimeType.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(candidate.substring(start, end + 1));
  } catch {
    return null;
  }
};

const toStringField = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
};

const isKeyMissing = (): boolean =>
  !GEMINI_API_KEY || GEMINI_API_KEY.trim() === '' || GEMINI_API_KEY === 'YOUR_KEY_HERE';

let warnedMissingKey = false;

/**
 * Send the photo to Gemini and return the extracted fields.
 * Returns null on missing key, network error, quota error, or malformed reply
 * so the caller can fall back to on-device ML Kit.
 */
export const analyzeImageWithGemini = async (
  photoUri: string
): Promise<ExtractedData | null> => {
  if (isKeyMissing()) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn(
        'Gemini API key is missing. Add EXPO_PUBLIC_GEMINI_API_KEY to .env — using ML Kit.'
      );
    }
    return null;
  }

  let base64Image: string;
  try {
    base64Image = await FileSystem.readAsStringAsync(photoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (error) {
    console.warn('Gemini: could not read image', error);
    return null;
  }

  const mimeType = /\.png(\?|$)/i.test(photoUri) ? 'image/png' : 'image/jpeg';

  const body = JSON.stringify({
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: base64Image } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      // 2.5 Flash spends part of the budget on "thinking"; keep enough room
      // so the JSON reply is never truncated.
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  });

  const models = MODEL_FALLBACKS.filter((m, i) => m && MODEL_FALLBACKS.indexOf(m) === i);

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(buildUrl(model), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });

      // Model not available on this API version — try the next one.
      if (response.status === 404) {
        continue;
      }

      if (!response.ok) {
        console.warn('Gemini OCR failed with status', response.status);
        return null;
      }

      const data = (await response.json()) as GeminiResponse;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = parseJsonObject(text);

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        console.warn('Gemini OCR returned no usable JSON');
        return null;
      }

      const record = parsed as Record<string, unknown>;
      const extracted: ExtractedData = {
        name: toStringField(record.name),
        address: toStringField(record.address),
        phone: toStringField(record.phone),
        city: toStringField(record.city),
      };

      // Nothing usable extracted — let ML Kit try.
      if (!extracted.name && !extracted.address && !extracted.phone && !extracted.city) {
        return null;
      }

      return extracted;
    } catch (error) {
      // AbortError = timeout; other errors are usually offline/DNS.
      console.warn('Gemini OCR request failed', error);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  console.warn('Gemini: no available model answered — using ML Kit.');
  return null;
};

// ---------------------------------------------------------------------------
// Route optimization
// ---------------------------------------------------------------------------

export interface DeliveryForRoute {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

// Sorting is a small text task, but give slow networks a little more room
// than OCR: a wrong/partial answer is rejected anyway.
const ROUTE_TIMEOUT_MS = 8000;

const parseJsonArray = (text: string): unknown => {
  if (!text) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  const start = candidate.indexOf('[');
  const end = candidate.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(candidate.substring(start, end + 1));
  } catch {
    return null;
  }
};

/**
 * Ask Gemini to order pending deliveries nearest-first from the driver's
 * position. Returns delivery IDs only when the answer is a permutation of the
 * input — never a partial list — so the caller can safely fall back.
 */
export const optimizeRouteWithGemini = async (
  deliveries: DeliveryForRoute[],
  userLat: number,
  userLon: number
): Promise<string[] | null> => {
  if (isKeyMissing() || deliveries.length < 2) return null;

  const compact = deliveries.map((d) => ({
    id: d.id,
    name: d.name.slice(0, 60),
    address: d.address.slice(0, 100),
    lat: d.latitude,
    lon: d.longitude,
  }));

  const prompt = `You are a route optimization assistant for a delivery driver.
Driver's current position: {"lat": ${userLat}, "lon": ${userLon}}

Deliveries (JSON):
${JSON.stringify(compact)}

Task: order ALL deliveries with a nearest-neighbor route starting from the
driver's position (closest first, then continue from the last stop).

Rules:
- Return ONLY a JSON array containing every "id" exactly once.
- Do not invent IDs, do not omit IDs, do not add any text or explanation.
- Example: ["id1","id2","id3"]`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  });

  const models = MODEL_FALLBACKS.filter((m, i) => m && MODEL_FALLBACKS.indexOf(m) === i);
  const expectedIds = new Set(deliveries.map((d) => d.id));

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ROUTE_TIMEOUT_MS);

    try {
      const response = await fetch(buildUrl(model), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });

      if (response.status === 404) continue;

      if (!response.ok) {
        console.warn('Gemini routing failed with status', response.status);
        return null;
      }

      const data = (await response.json()) as GeminiResponse;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = parseJsonArray(text);

      if (!Array.isArray(parsed) || parsed.length !== deliveries.length) {
        console.warn('Gemini routing returned an invalid array');
        return null;
      }

      const ids = parsed.filter((value): value is string => typeof value === 'string');
      const unique = new Set(ids);

      // Must be a full permutation of the pending deliveries.
      if (ids.length !== deliveries.length || unique.size !== expectedIds.size) {
        console.warn('Gemini routing returned duplicate or missing IDs');
        return null;
      }
      for (const id of ids) {
        if (!expectedIds.has(id)) {
          console.warn('Gemini routing returned an unknown ID');
          return null;
        }
      }

      return ids;
    } catch (error) {
      console.warn('Gemini routing request failed', error);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
};
