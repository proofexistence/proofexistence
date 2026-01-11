'use client';

import React, { useState } from 'react';
import { usePathname as useNextPathname } from 'next/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Heart, Wallet } from 'lucide-react';
import { SponsorModal } from '@/components/sponsor/sponsor-modal';
import { LanguageSelector } from './language-selector';

export function Footer() {
  const pathname = useNextPathname();
  const t = useTranslations('footer');
  const [sponsorOpen, setSponsorOpen] = useState(false);

  // Hide footer on specific routes (check for locale prefix pattern)
  if (
    pathname?.endsWith('/cosmos') ||
    pathname?.endsWith('/canvas') ||
    pathname?.includes('/proof/')
  ) {
    return null;
  }

  return (
    <footer className="w-full border-t border-white/5 bg-transparent mt-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              {t('title')}
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
              {t('tagline')}
              <br />
              {t('proveHere')}
              <br />
              <span className="opacity-50">{t('established')}</span>
            </p>
            <div className="flex items-center gap-4 pt-2">
              <Link
                href="/supporters"
                className="text-xs font-medium text-zinc-500 hover:text-white transition-colors flex items-center gap-2 group"
              >
                <Heart className="w-3 h-3 group-hover:text-red-500 transition-colors" />
                {t('viewSupporters')}
              </Link>
            </div>
          </div>

          {/* Sponsor Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Wallet className="w-4 h-4 text-zinc-400" />
              <h4 className="text-sm font-semibold text-zinc-200">
                {t('supportProject')}
              </h4>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setSponsorOpen(true)}
                className="group flex items-center gap-3 px-6 py-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
              >
                <Heart className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <span className="font-medium text-zinc-200 group-hover:text-white transition-colors">
                    {t('sponsorStranger')}
                  </span>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {t('sponsorDescription')}
                  </p>
                </div>
              </button>

              <a
                href="https://www.producthunt.com/products/proof-of-existence-2026?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-proof-of-existence-2026"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1060897&theme=dark&t=1768141836161"
                  alt="PROOF OF EXISTENCE 2026 - Prove you existed in 2026 - draw, recorded forever | Product Hunt"
                  width={250}
                  height={54}
                  unoptimized
                />
              </a>
            </div>

            <p className="text-xs text-zinc-500 mt-3 pl-1">
              {t('donationNote')}
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            {t('copyright', { year: new Date().getFullYear() })}
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/brands"
              className="text-xs text-zinc-600 hover:text-white transition-colors"
            >
              {t('brandSponsorship')}
            </Link>
            <Link
              href="/whitepaper"
              className="text-xs text-zinc-600 hover:text-white transition-colors"
            >
              {t('whitepaper')}
            </Link>
            <a
              href="https://github.com/proofexistence"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-600 hover:text-white transition-colors"
            >
              {t('github')}
            </a>
            <a
              href="https://x.com/Proofexist2006"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-600 hover:text-white transition-colors"
            >
              {t('twitter')}
            </a>
            <LanguageSelector />
          </div>
        </div>
      </div>

      {/* Sponsor Modal */}
      <SponsorModal open={sponsorOpen} onOpenChange={setSponsorOpen} />
    </footer>
  );
}
