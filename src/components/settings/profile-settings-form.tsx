'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Loader2, Save, ExternalLink, Camera } from 'lucide-react';
import NextImage from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import { useUserProfile } from '@/hooks/use-user-profile';

/**
 * Profile Settings Form
 *
 * Data sources:
 * - Clerk: firstName, lastName, profileImage
 * - DB: username, displayName (name field)
 *
 * Display name logic:
 * - If checkbox checked: use firstName + lastName as display name
 * - If checkbox unchecked: use custom display name
 * - If empty: show as "Anonymous"
 */
export function ProfileSettingsForm() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const { profile, isLoading: isProfileLoading } = useUserProfile();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state - initialized from profile data
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [useFullNameAsDisplay, setUseFullNameAsDisplay] = useState(false); // Default unchecked until profile loads

  // Track if user has modified the form. If so, stop syncing with profile data.
  const isDirtyRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<{
    base64: string;
    type: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Sync form state with profile data
  // We allow updates as long as the user hasn't started typing (isDirtyRef).
  // This fixes the issue where an initial empty profile might lock the form, preventing the real data from loading.
  useEffect(() => {
    // Only proceed if we have a profile
    if (!profile) return;

    // If user has already edited the form, do NOT overwrite their changes
    if (isDirtyRef.current) return;

    // From Clerk
    // Only update if the state is empty or different, to avoid unnecessary re-renders (though React handles this)
    if (profile.firstName) setFirstName(profile.firstName);
    if (profile.lastName) setLastName(profile.lastName);

    // From DB
    if (profile.username) setUsername(profile.username);
    if (profile.displayName) setDisplayName(profile.displayName);

    // Determine checkbox state:
    // - Only set this ONCE during first initialization or if we haven't touched it logic?
    // - Actually, just re-evaluate if not dirty is fine.
    const fullName = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const isUsingFullName = profile.displayName === fullName && fullName !== '';

    // Only update these if we actually have data, to avoid un-checking it by accident if data is missing
    if (profile.displayName || fullName) {
      setUseFullNameAsDisplay(isUsingFullName);
    }

    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [profile, isInitialized]);

  // Computed values
  const computedFullName = [firstName, lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const computedDisplayName = useFullNameAsDisplay
    ? computedFullName
    : displayName;
  const displayLabel = computedDisplayName || 'Anonymous';

  // Image handling
  const displayImage = imagePreview || profile?.imageUrl;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    isDirtyRef.current = true;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      setImageFile({ base64, type: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Update Clerk (firstName, lastName, profileImage)
      if (clerkUser) {
        const clerkUpdates: { firstName?: string; lastName?: string } = {};

        if (firstName !== (clerkUser.firstName || '')) {
          clerkUpdates.firstName = firstName || '';
        }
        if (lastName !== (clerkUser.lastName || '')) {
          clerkUpdates.lastName = lastName || '';
        }

        if (Object.keys(clerkUpdates).length > 0) {
          await clerkUser.update(clerkUpdates);
        }

        // Upload image to Clerk if changed
        if (imageFile) {
          const base64Data = imageFile.base64.includes(',')
            ? imageFile.base64.split(',')[1]
            : imageFile.base64;
          const buffer = Uint8Array.from(atob(base64Data), (c) =>
            c.charCodeAt(0)
          );
          const blob = new Blob([buffer], { type: imageFile.type });
          const file = new File([blob], 'avatar.webp', {
            type: imageFile.type,
          });
          await clerkUser.setProfileImage({ file });
        }
      }

      // 2. Update DB (username, displayName)
      const finalDisplayName = useFullNameAsDisplay
        ? computedFullName || null
        : displayName || null;

      const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username || null,
          name: finalDisplayName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      // Success!
      setSuccess(true);
      setImageFile(null);
      setImagePreview(null);

      // Reload Clerk user to get updated data
      await clerkUser?.reload();

      // Refetch profile data to update all components (navbar, etc.)
      await queryClient.refetchQueries({ queryKey: ['db-profile'] });

      // Dispatch event for any components not using React Query
      window.dispatchEvent(new CustomEvent('profile-updated'));

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      console.error('[Settings] Error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Something went wrong');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClerkLoaded || isProfileLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Profile Header */}
      <div className="flex items-center gap-6">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageSelect}
          accept="image/*"
          className="hidden"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-blue-500 p-0.5 cursor-pointer group hover:scale-105 transition-transform"
        >
          <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden relative">
            {displayImage ? (
              <NextImage
                src={displayImage}
                alt="Profile"
                fill
                className="object-cover"
              />
            ) : (
              <span className="text-3xl">👤</span>
            )}
          </div>
          {isLoading ? (
            <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          ) : (
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-1">
          <h3 className="text-lg font-medium text-white">{displayLabel}</h3>
          <p className="text-xs text-zinc-500">
            Click the avatar to upload a new photo.
          </p>
        </div>
      </div>

      {/* Username (DB) */}
      <div className="space-y-2">
        <label
          htmlFor="username"
          className="block text-sm font-medium text-zinc-400"
        >
          Username (Unique)
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            isDirtyRef.current = true;
          }}
          disabled={isLoading}
          className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all placeholder:text-zinc-600 disabled:opacity-50"
          placeholder="e.g. SatoshiNakamoto"
          maxLength={30}
        />
        <p className="text-xs text-zinc-500">
          Your unique handle. Visible at /u/{username || 'username'}
        </p>
      </div>

      {/* First Name & Last Name (Clerk) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-zinc-400"
          >
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              isDirtyRef.current = true;
            }}
            disabled={isLoading}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all placeholder:text-zinc-600 disabled:opacity-50"
            placeholder="e.g. Satoshi"
            maxLength={50}
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-zinc-400"
          >
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              isDirtyRef.current = true;
            }}
            disabled={isLoading}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all placeholder:text-zinc-600 disabled:opacity-50"
            placeholder="e.g. Nakamoto"
            maxLength={50}
          />
        </div>
      </div>

      {/* Display Name Toggle (DB) */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            id="useFullName"
            type="checkbox"
            checked={useFullNameAsDisplay}
            onChange={(e) => {
              setUseFullNameAsDisplay(e.target.checked);
              isDirtyRef.current = true;
            }}
            disabled={isLoading}
            className="w-4 h-4 rounded border-white/20 bg-zinc-900 text-purple-500 focus:ring-purple-500/50 focus:ring-offset-0"
          />
          <label htmlFor="useFullName" className="text-sm text-zinc-400">
            Use first and last name as display name
          </label>
        </div>

        {!useFullNameAsDisplay && (
          <div className="space-y-2">
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-zinc-400"
            >
              Custom Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                isDirtyRef.current = true;
              }}
              disabled={isLoading}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all placeholder:text-zinc-600 disabled:opacity-50"
              placeholder="e.g. Satoshi"
              maxLength={50}
            />
          </div>
        )}

        <div className="text-xs text-zinc-500">
          Your display name will be:{' '}
          <span className="text-white">{displayLabel}</span>
        </div>
        <p className="text-xs text-zinc-600">
          Leave empty to appear as &ldquo;Anonymous&rdquo; on the platform.
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          Profile updated successfully!
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            Save Changes
          </>
        )}
      </button>

      {/* Wallet Info */}
      {profile?.walletAddress && (
        <div className="pt-6 border-t border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500 mb-1">Connected Wallet</p>
              <p className="font-mono text-sm text-zinc-300">
                {profile.walletAddress}
              </p>
            </div>
            <a
              href={`https://polygonscan.com/address/${profile.walletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Referral Link */}
          <div className="pt-4 border-t border-white/5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-400">
                Your Referral Link
              </label>
              {profile.referralCode ? (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      readOnly
                      value={
                        typeof window !== 'undefined'
                          ? `${window.location.origin}/?ref=${profile.referralCode}`
                          : ''
                      }
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-zinc-300 font-mono text-sm focus:ring-0 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        const link = `${window.location.origin}/?ref=${profile.referralCode}`;
                        navigator.clipboard.writeText(link);
                        setSuccess(true);
                        setTimeout(() => setSuccess(false), 2000);
                      }
                    }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Copy
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-white/5 rounded-lg text-sm text-zinc-400">
                  Referral code not generated yet. <br />
                  <span className="text-xs text-zinc-500">
                    Please sign out and sign back in to generate one.
                  </span>
                </div>
              )}
              <p className="text-xs text-zinc-500">
                Share this link to invite friends. You&apos;ll be marked as
                their referrer.
              </p>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
