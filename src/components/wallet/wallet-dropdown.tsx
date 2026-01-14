'use client';

import { useWeb3Auth } from '@/lib/web3auth';
import { useProfile } from '@/hooks/use-profile';
import { useState, useEffect, useRef } from 'react';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { Settings, LogOut, User, Key, Share2, Copy, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { WalletHeader } from './wallet-header';
import { WalletBalances } from './wallet-balances';
import { WalletPendingRewards } from './wallet-pending-rewards';
import { ExportKeyDialog } from './export-key-dialog';
import { useTranslations } from 'next-intl';

export function WalletDropdown() {
  const t = useTranslations('nav');
  const {
    isLoading: isAuthLoading,
    isConnected,
    user,
    login,
    logout,
    isExternalWallet,
  } = useWeb3Auth();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Only use DB profile data - no fallback to Web3Auth to avoid flickering
  const walletAddress = profile?.walletAddress || user?.walletAddress;
  const displayName = profile?.name || null;
  const username = profile?.username || null;
  const userImage = profile?.avatarUrl || null;
  const referralCode = profile?.referralCode || null;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCopyReferral = async () => {
    if (!referralCode) return;
    const referralLink = `${window.location.origin}?ref=${referralCode}`;
    await navigator.clipboard.writeText(referralLink);
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2000);
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  if (isAuthLoading || (isConnected && isProfileLoading)) return null;

  return (
    <>
      <div className="relative z-[100] pointer-events-auto" ref={dropdownRef}>
        {isConnected && walletAddress ? (
          <div className="relative">
            {/* Avatar Button - Click to toggle */}
            <button
              onClick={toggleDropdown}
              className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 hover:border-white/40 transition-all shadow-lg shadow-black/20 cursor-pointer"
            >
              {userImage ? (
                <Image
                  src={userImage}
                  alt="Profile"
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-black/40 backdrop-blur-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-white/70" />
                </div>
              )}
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-64 bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl origin-top-right overflow-hidden z-[100]"
                >
                  {/* Header - Network, Name & Address */}
                  <WalletHeader
                    walletAddress={walletAddress}
                    displayName={displayName}
                    username={username}
                    onNavigate={() => setIsOpen(false)}
                  />

                  {/* Balances Section */}
                  <WalletBalances />

                  {/* Pending Rewards */}
                  <WalletPendingRewards />

                  {/* Referral Section */}
                  {referralCode && (
                    <div className="px-4 py-3 border-b border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                            {t('referral')}
                          </span>
                        </div>
                        <button
                          onClick={handleCopyReferral}
                          className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                        >
                          {referralCode}
                          {referralCopied ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="py-1">
                    {/* View Profile */}
                    <Link
                      href={
                        username
                          ? `/u/${username}`
                          : walletAddress
                            ? `/u/${walletAddress}`
                            : '#'
                      }
                      onClick={() => setIsOpen(false)}
                      className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2.5"
                    >
                      <User className="w-4 h-4" />
                      {t('viewProfile')}
                    </Link>

                    {/* Export Private Key - only for social login users */}
                    {!isExternalWallet && (
                      <button
                        onClick={() => setShowExportDialog(true)}
                        className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2.5"
                      >
                        <Key className="w-4 h-4" />
                        {t('exportPrivateKey')}
                      </button>
                    )}

                    <Link
                      href="/settings"
                      onClick={() => setIsOpen(false)}
                      className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2.5"
                    >
                      <Settings className="w-4 h-4" />
                      {t('settings')}
                    </Link>

                    <button
                      onClick={() => logout()}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2.5"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('logOut')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button
            onClick={() => login()}
            className="bg-black/20 hover:bg-black/40 backdrop-blur-xl text-white font-medium px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 transition-all shadow-lg active:scale-95 text-sm"
          >
            {t('login')}
          </button>
        )}
      </div>

      {/* Export Key Dialog */}
      <ExportKeyDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
      />
    </>
  );
}
