'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useWeb3Auth } from '@/lib/web3auth';
import { useEffect, useState } from 'react';
import VariableFontHoverByRandomLetter from '@/components/fancy/text/variable-font-hover-by-random-letter';
import {
  Menu,
  X,
  Globe,
  LineSquiggle,
  Settings,
  User,
  Gift,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { useUserProfile } from '@/hooks/use-user-profile';
import { isLaunchTime } from '@/lib/launch-config';
import { NavbarCountdown } from './navbar-countdown';
import { MobileConnectButton } from '@/components/auth/mobile-connect-button';
import { ReferralDialog } from '@/components/ui/referral-dialog';

export function Navbar() {
  const { profile, isLoading, isAuthenticated } = useUserProfile();
  const { logout } = useWeb3Auth();

  const handleSignOut = () => logout();

  const ready = !isLoading;
  const authenticated = isAuthenticated;
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);

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
  if (pathname?.startsWith('/canvas') || pathname?.startsWith('/proof'))
    return null;

  const leftNavLinks = [
    {
      name: 'Whitepaper',
      href: '/whitepaper',
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
    { name: 'Explore', href: '/explore', icon: <Globe className="w-4 h-4" /> },

    {
      name: 'Cosmos',
      href: '/cosmos',
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

  const profileLink = {
    name: 'Profile',
    href: profile?.username
      ? `/u/${profile.username}`
      : profile?.walletAddress
        ? `/u/${profile.walletAddress}`
        : '#',
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
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  };

  // Dashboard removed from desktop right nav
  const rightNavLinks: { name: string; href: string; icon: React.ReactNode }[] =
    [];

  // Combine for mobile menu
  const mobileNavLinks = [
    ...leftNavLinks,
    ...(authenticated ? [...rightNavLinks, profileLink] : []),
  ];

  return (
    <>
      <nav className="fixed top-6 left-0 w-full p-6 flex justify-between items-center z-50 pointer-events-none">
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
                  label="Draw to Proof"
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

          {/* Right Pill: Auth Actions & Right Nav Links */}
          <div className="pointer-events-auto flex items-center gap-2">
            {ready && authenticated ? (
              <div className="relative group">
                <div className="flex items-center gap-1 p-1 pl-1.5 pr-1.5 bg-black/10 backdrop-blur-md border border-white/10 rounded-full shadow-lg shadow-black/20 hover:border-white/20 transition-all duration-300">
                  {/* Right Nav Links (Desktop) */}
                  <div className="flex items-center gap-1">
                    {rightNavLinks.map((link) => (
                      <Link
                        key={link.name}
                        href={link.href}
                        className="px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                      >
                        {link.name}
                      </Link>
                    ))}
                  </div>

                  <Link
                    href={profileLink.href}
                    className="flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-full hover:bg-white/5 transition-colors group-hover:bg-white/5"
                  >
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center border border-white/5 overflow-hidden relative">
                      {profile?.imageUrl ? (
                        <Image
                          src={profile.imageUrl}
                          alt="Profile"
                          fill
                          sizes="28px"
                          className="object-cover"
                        />
                      ) : (
                        <User className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                    <span className="text-sm font-mono text-zinc-300">
                      {profile?.displayLabel || 'Connected'}
                    </span>
                  </Link>
                </div>

                <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right">
                  <div className="px-4 py-2 border-b border-white/10">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
                      Connected
                    </div>
                    <div className="text-xs font-mono text-zinc-300 truncate">
                      {profile?.walletAddress}
                    </div>
                  </div>

                  <button
                    onClick={() => setIsReferralOpen(true)}
                    className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    Invite Friends
                  </button>
                  <Link
                    href="/settings"
                    className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Settings
                  </Link>
                  <button
                    onClick={async () => {
                      await handleSignOut();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Log Out
                  </button>
                </div>
              </div>
            ) : (
              <MobileConnectButton>
                <button className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-zinc-200 hover:scale-105 transition-all shadow-lg shadow-white/10">
                  Login
                </button>
              </MobileConnectButton>
            )}
          </div>
        </div>

        {/* ------------------- MOBILE VIEW (md:hidden) ------------------- */}
        <div className="flex md:hidden w-full items-center justify-between pointer-events-auto">
          {/* Mobile Logo Pill */}
          <Link href="/" className="flex items-center">
            <Image
              src="/proof_existence_logo.webp"
              alt="Proof of Existence"
              width={36}
              height={36}
              className="w-9 h-9 object-contain"
            />
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2.5 bg-black/10 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/10 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
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
                  Prove Existence
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-white/10 w-full mb-8" />

            {/* Auth Section */}
            <div className="mt-auto">
              {ready && authenticated ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">
                      Connected Wallet
                    </div>
                    <div className="font-mono text-zinc-200 break-all text-sm">
                      {profile?.walletAddress}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await handleSignOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Log Out
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
                      // Close the mobile menu when the connect button is clicked
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-4 rounded-xl border border-white/20 text-white font-medium hover:bg-white/10 transition-colors"
                  >
                    Connect Wallet
                  </button>
                </MobileConnectButton>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Referral Dialog */}
      <ReferralDialog open={isReferralOpen} onOpenChange={setIsReferralOpen} />
    </>
  );
}
