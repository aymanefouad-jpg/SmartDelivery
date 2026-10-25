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

// gemini-1.5-flash is retired by Google. 2.5 Flash is the current stable
// vision model; EXPO_PUBLIC_GEMINI_MODEL lets you override without code changes.
const DEFAULT_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash';
const MODEL_FALLBACKS = [
  DEFAULT_MODEL,
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];
const REQUEST_TIMEOUT_MS = 20000;

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
