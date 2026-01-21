'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, FlaskConical, Circle, Flower2 } from 'lucide-react';

export function ArtDropdown() {
  const t = useTranslations('nav');
  const [isOpen, setIsOpen] = useState(false);

  const items = [
    {
      key: 'daisyPoe',
      href: '/daily-art' as const,
      icon: <Flower2 className="w-4 h-4" />,
    },
    {
      key: 'orbitPoe',
      href: '/col' as const,
      icon: <Circle className="w-4 h-4" />,
    },
    {
      key: 'walkerPoe',
      href: '/lab' as const,
      icon: <FlaskConical className="w-4 h-4" />,
    },
  ];

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Trigger Button */}
      <button
        className="flex items-center gap-1 px-2.5 py-1 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {t('poeGen')}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 w-48 py-2 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl origin-top-left overflow-hidden"
          >
            {items.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                {item.icon}
                {t(item.key)}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
