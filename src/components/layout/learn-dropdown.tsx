'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, BookOpen, Sparkles, MessageCircle, FileText } from 'lucide-react';

export function LearnDropdown() {
  const t = useTranslations('nav');
  const [isOpen, setIsOpen] = useState(false);

  const categories = [
    {
      key: 'gettingStarted',
      href: '/learn#getting-started' as const,
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      key: 'tutorials',
      href: '/learn#tutorials' as const,
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      key: 'stories',
      href: '/learn#stories' as const,
      icon: <MessageCircle className="w-4 h-4" />,
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
        {t('learn')}
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
            className="absolute left-0 top-full mt-2 w-52 py-2 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl origin-top-left overflow-hidden"
          >
            {/* Category Links */}
            {categories.map((category) => (
              <Link
                key={category.key}
                href={category.href}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                {category.icon}
                {t(category.key)}
              </Link>
            ))}

            {/* Divider */}
            <div className="my-2 border-t border-white/10" />

            {/* Whitepaper Link */}
            <Link
              href="/whitepaper"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <FileText className="w-4 h-4" />
              {t('whitepaper')}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
