'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales, localeNames, type Locale } from '@/i18n/config';
import { Globe, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function LanguageSelector() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('languageSelector');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/5"
        aria-label={t('label')}
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="uppercase font-medium">{locale}</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 bg-black/90 backdrop-blur-md border border-white/10 rounded-lg shadow-xl overflow-hidden min-w-[140px]">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between ${
                locale === loc
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{localeNames[loc]}</span>
              {locale === loc && (
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
