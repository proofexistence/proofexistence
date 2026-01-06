'use client';

import Image from 'next/image';
import { Link, useRouter, usePathname } from '@/i18n/navigation';
import { usePathname as useNextPathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useWeb3Auth } from '@/lib/web3auth';
import { useEffect, useState } from 'react';
import VariableFontHoverByRandomLetter from '@/components/fancy/text/variable-font-hover-by-random-letter';
import {
  Menu,
  X,
  Globe,
  LineSquiggle,
  Wallet,
  User,
  Settings,
  LogOut,
  Key,
  Copy,
  Check,
  Share2,
  RefreshCw,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { useProfile } from '@/hooks/use-profile';
import { isLaunchTime } from '@/lib/launch-config';
import { NavbarCountdown } from './navbar-countdown';
import { MobileConnectButton } from '@/components/auth/mobile-connect-button';
import { WalletDropdown, ExportKeyDialog } from '@/components/wallet';
import { useNetworkInfo } from '@/hooks/use-network-info';
import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { ethers } from 'ethers';

export function Navbar() {
  const { profile, isLoading, isAuthenticated } = useProfile();
  const { logout, isExternalWallet } = useWeb3Auth();
  const network = useNetworkInfo();
  const {
    pol,
    time26,
    isLoading: balancesLoading,
    refresh: refreshBalances,
  } = useWalletBalances();
  // Use profile.time26Balance instead of separate API call
  const pendingBalance = profile?.time26Balance
    ? parseFloat(ethers.formatEther(profile.time26Balance)).toFixed(1)
    : '0';
  const t = useTranslations('nav');

  const handleSignOut = () => logout();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);

  const handleCopyReferral = async () => {
    if (!profile?.referralCode) return;
    const referralLink = `${window.location.origin}?ref=${profile.referralCode}`;
    await navigator.clipboard.writeText(referralLink);
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2000);
  };

  const handleCopyAddress = async () => {
    if (!profile?.walletAddress) return;
    await navigator.clipboard.writeText(profile.walletAddress);
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 2000);
  };

  const ready = !isLoading;
  const authenticated = isAuthenticated;
  const router = useRouter();
  const pathname = usePathname();
  const nextPathname = useNextPathname();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [launched, setLaunched] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setLaunched(isLaunchTime());
  }, []);

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  if (!mounted) return null;
  if (nextPathname?.includes('/canvas') || nextPathname?.includes('/proof/'))
    return null;

  const leftNavLinks = [
    {
      name: t('whitepaper'),
      href: '/whitepaper' as const,
      icon: (
        <svg
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 2C2.44772 2 2 2.44772 2 3V12C2 12.5523 2.44772 13 3 13H12C12.5523 13 13 12.5523 13 12V8.5C13 8.22386 13.2239 8 13.5 8C13.7761 8 14 8.22386 14 8.5V12C14 13.1046 13.1046 14 12 14H3C1.89543 14 1 13.1046 1 12V3C1 1.89543 1.89543 1 3 1H6.5C6.77614 1 7 1.22386 7 1.5C7 1.77614 6.77614 2 6.5 2H3Z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          />
          <path
            d="M14 1.5C14 1.22386 13.7761 1 13.5 1H10C9.72386 1 9.5 1.22386 9.5 1.5C9.5 1.77614 9.72386 2 10 2H12.2929L6.14645 8.14645C5.95118 8.34171 5.95118 8.65829 6.14645 8.85355C6.34171 9.04882 6.65829 9.04882 6.85355 8.85355L13 2.70711V5C13 5.27614 13.2239 5.5 13.5 5.5C13.7761 5.5 14 5.27614 14 5V1.5Z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      name: t('explore'),
      href: '/explore' as const,
      icon: <Globe className="w-4 h-4" />,
    },

    {
      name: t('cosmos'),
      href: '/cosmos' as const,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      ),
    },
  ];

  // Mobile nav links - just the main navigation, wallet section is separate
  const mobileNavLinks = [...leftNavLinks];

  return (
    <>
      <nav className="fixed top-3 md:top-4 left-0 w-full px-4 py-3 md:px-6 md:py-4 flex justify-between items-center z-50 pointer-events-none">
        {/* ------------------- DESKTOP VIEW (md:flex) ------------------- */}
        <div className="hidden md:flex w-full items-center justify-between relative">
          {/* Left Side Wrapper: Nav Pill + Independent Proof Button */}
          <div className="pointer-events-auto flex items-center gap-4">
            {/* Navigation Pill */}
            <div className="flex items-center gap-1 p-1 pl-1.5 pr-1.5 bg-black/10 backdrop-blur-md border border-white/10 rounded-full shadow-lg shadow-black/20 hover:border-white/20 transition-all duration-300">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/proof_existence_logo.webp"
                  alt="Proof of Existence"
                  width={28}
                  height={28}
                  className="w-7 h-7 object-contain"
                />
                {process.env.NEXT_PUBLIC_IS_TESTNET === 'true' && (
                  <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/30 text-[10px] font-mono text-yellow-500">
                    TESTNET
                  </span>
                )}
              </Link>

              <div className="h-3.5 w-[1px] bg-white/20 mx-1.5" />

              <div className="flex items-center">
                {leftNavLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="px-2.5 py-1 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Independent CTA */}
            {launched && (
              <Link
                href="/canvas"
                className="flex items-center gap-2 cursor-pointer transition-all hover:scale-105 group/proof"
              >
                <LineSquiggle className="w-5 h-5 text-zinc-400 group-hover/proof:text-white transition-colors" />
                <VariableFontHoverByRandomLetter
                  label={t('drawToProof')}
                  className="text-lg font-medium font-sans bg-clip-text text-transparent bg-[linear-gradient(to_right,#0CC9F2,#4877DA,#7E44DB)]"
                  fromFontVariationSettings={'"wght" 400'}
                  toFontVariationSettings={'"wght" 900'}
                />
              </Link>
            )}
          </div>

          {/* Centered Countdown */}
          <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto">
            {!pathname?.startsWith('/cosmos') && <NavbarCountdown />}
          </div>

          {/* Right: Wallet Dropdown */}
          <div className="pointer-events-auto">
            <WalletDropdown />
          </div>
        </div>

        {/* ------------------- MOBILE VIEW (md:hidden) ------------------- */}
        <div className="flex md:hidden w-full items-center justify-between pointer-events-auto">
          {/* Mobile Logo - Fixed width for balance */}
          <Link href="/" className="flex items-center w-10">
            <Image
              src="/proof_existence_logo.webp"
              alt="Proof of Existence"
              width={36}
              height={36}
              className="w-9 h-9 object-contain"
            />
          </Link>

          {/* Center spacer for Find My Star (rendered by cosmos-canvas) */}
          <div className="flex-1" />

          {/* Mobile Menu Toggle - Fixed width for balance */}
          <div className="w-10 flex justify-end">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 bg-black/10 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/10 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ------------------- MOBILE MENU OVERLAY ------------------- */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            key="mobile-menu-overlay"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-3xl flex flex-col p-6 overflow-y-auto"
          >
            {/* Header: Logo + Close Button */}
            <div className="flex items-center justify-between mb-8">
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3"
              >
                <Image
                  src="/proof_existence_logo.webp"
                  alt="Proof of Existence"
                  width={40}
                  height={40}
                  className="w-10 h-10 object-contain"
                />
                <span className="font-bold text-lg text-white tracking-widest">
                  POE 2026
                </span>
                {process.env.NEXT_PUBLIC_IS_TESTNET === 'true' && (
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/30 text-[10px] font-mono text-yellow-500">
                    TESTNET
                  </span>
                )}
              </Link>

              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2.5 bg-white/5 border border-white/10 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Navigation Links */}
            <div className="flex flex-col gap-2 mb-8">
              {mobileNavLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-4 p-4 rounded-xl text-lg font-medium text-zinc-300 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all"
                >
                  {link.icon}
                  {link.name}
                </Link>
              ))}
            </div>

            {/* CTA Button */}
            {launched && (
              <div className="mb-8">
                <button
                  onClick={() => {
                    router.push('/canvas');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-4 rounded-xl bg-white text-black font-bold text-lg shadow-lg shadow-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span className="relative flex h-3 w-3 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-black"></span>
                  </span>
                  {t('proveExistence')}
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-white/10 w-full mb-6" />

            {/* Wallet Section */}
            <div className="mt-auto">
              {ready && authenticated ? (
                <div className="space-y-4">
                  {/* Wallet Card */}
                  <div className="rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 overflow-hidden">
                    {/* Header with Avatar & Name */}
                    <div className="p-4 flex items-center gap-3 border-b border-white/10">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/20">
                        {profile?.avatarUrl ? (
                          <Image
                            src={profile.avatarUrl}
                            alt="Profile"
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center">
                            <User className="w-6 h-6 text-white/70" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-zinc-400" />
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              network.isTestnet
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-purple-500/20 text-purple-300'
                            }`}
                          >
                            {network.shortName}
                          </span>
                        </div>
                        {profile?.name && (
                          <div className="text-base font-semibold text-white truncate mt-1">
                            {profile.name}
                          </div>
                        )}
                        {profile?.username && (
                          <div className="text-sm text-zinc-400 truncate">
                            @{profile.username}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Wallet Address */}
                    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                      <span className="text-xs font-mono text-zinc-400">
                        {profile?.walletAddress?.slice(0, 8)}...
                        {profile?.walletAddress?.slice(-6)}
                      </span>
                      <button
                        onClick={handleCopyAddress}
                        className="text-zinc-500 hover:text-white transition-colors"
                      >
                        {addressCopied ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Balances */}
                    <div className="px-4 py-3 border-b border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                          {t('balances')}
                        </span>
                        <button
                          onClick={refreshBalances}
                          disabled={balancesLoading}
                          className={`transition-colors ${
                            balancesLoading
                              ? 'text-green-400'
                              : 'text-zinc-500 hover:text-white'
                          }`}
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${balancesLoading ? 'animate-spin' : ''}`}
                          />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-white/5">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                              <span className="text-[8px] font-bold text-white">
                                P
                              </span>
                            </div>
                            <span className="text-xs text-zinc-400">POL</span>
                          </div>
                          <div className="text-lg font-mono font-semibold text-white">
                            {balancesLoading ? '-' : pol.formatted}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                              <span className="text-[8px] font-bold text-white">
                                T
                              </span>
                            </div>
                            <span className="text-xs text-zinc-400">
                              TIME26
                            </span>
                          </div>
                          <div className="text-lg font-mono font-semibold text-white">
                            {balancesLoading ? '-' : time26.formatted}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pending Rewards */}
                    {pendingBalance && pendingBalance !== '0' && (
                      <div className="px-4 py-3 border-b border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-xs text-zinc-400">
                              {t('pendingRewards')}
                            </span>
                          </div>
                          <span className="text-sm font-mono font-semibold text-green-400">
                            +{pendingBalance} T26
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Referral */}
                    {profile?.referralCode && (
                      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Share2 className="w-4 h-4 text-zinc-500" />
                          <span className="text-xs text-zinc-400">
                            {t('referral')}
                          </span>
                        </div>
                        <button
                          onClick={handleCopyReferral}
                          className="flex items-center gap-1.5 px-2 py-1 text-xs font-mono bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg transition-colors"
                        >
                          {profile.referralCode}
                          {referralCopied ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Action Links */}
                    <div className="p-2">
                      <Link
                        href={
                          profile?.username
                            ? `/u/${profile.username}`
                            : `/u/${profile?.walletAddress}`
                        }
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        {t('viewProfile')}
                      </Link>
                      {!isExternalWallet && (
                        <button
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setShowExportDialog(true);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Key className="w-4 h-4" />
                          {t('exportPrivateKey')}
                        </button>
                      )}
                      <Link
                        href="/settings"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        {t('settings')}
                      </Link>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <button
                    onClick={async () => {
                      await handleSignOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('logOut')}
                  </button>
                </div>
              ) : (
                <MobileConnectButton
                  className="w-full"
                  onOpenChange={(open) => {
                    if (!open) {
                      // Optional logic if needed when dialog closes
                    }
                  }}
                >
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-4 rounded-xl bg-white text-black font-semibold hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Wallet className="w-5 h-5" />
                    {t('connectWallet')}
                  </button>
                </MobileConnectButton>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Key Dialog */}
      <ExportKeyDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
      />
    </>
  );
}
