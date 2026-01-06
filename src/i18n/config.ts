export const locales = ['en', 'zh', 'cn', 'es', 'ja', 'fr'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  zh: '中文繁体',
  cn: '中文简体',
  es: 'Español',
  ja: '日本語',
  fr: 'Français',
};
