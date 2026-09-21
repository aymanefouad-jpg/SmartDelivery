import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import { translations } from './translations';

export const i18n = new I18n(translations);
i18n.locale = Localization.getLocales()[0]?.languageCode ?? 'ar';
i18n.enableFallback = true;
i18n.defaultLocale = 'ar';

export const setLanguage = (lang: 'ar' | 'en' | 'fr') => {
  i18n.locale = lang;
};

export const t = (key: string): string => i18n.t(key);