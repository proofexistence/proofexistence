'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Users, Gift } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useUserProfile } from '@/hooks/use-user-profile';

interface ReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReferralDialog({ open, onOpenChange }: ReferralDialogProps) {
  const { profile } = useUserProfile();
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  const referralLink =
    typeof window !== 'undefined' && profile?.referralCode
      ? `${window.location.origin}/?ref=${profile.referralCode}`
      : '';

  // Fetch referral count when dialog opens
  useEffect(() => {
    if (!open || !profile?.id) return;

    let cancelled = false;

    const fetchReferrals = async () => {
      try {
        const res = await fetch(`/api/user/referrals`);
        const data = await res.json();
        if (!cancelled) {
          setReferralCount(data.count ?? 0);
          setIsLoadingCount(false);
        }
      } catch {
        if (!cancelled) {
          setReferralCount(0);
          setIsLoadingCount(false);
        }
      }
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingCount(true);
    fetchReferrals();

    return () => {
      cancelled = true;
    };
  }, [open, profile?.id]);

  const handleCopy = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/95 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-400" />
            Invite Friends
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Share your referral link and earn rewards together.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Stats */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
              <Users className="w-4 h-4" />
              Friends Invited
            </div>
            <div className="text-2xl font-bold text-white">
              {isLoadingCount ? (
                <span className="text-zinc-500">...</span>
              ) : (
                (referralCount ?? 0)
              )}
            </div>
          </div>

          {/* Referral Link */}
          {profile?.referralCode ? (
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">
                Your Referral Link
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={referralLink}
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-zinc-300 font-mono text-sm focus:ring-0 outline-none truncate"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-white/5 rounded-xl text-sm text-zinc-400 text-center">
              Referral code not generated yet.
              <br />
              <span className="text-xs text-zinc-500">
                Please sign out and sign back in to generate one.
              </span>
            </div>
          )}

          {/* Info */}
          <p className="text-sm text-zinc-400 text-center">
            Share this link with friends. They&apos;ll be connected to you when
            they join.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
