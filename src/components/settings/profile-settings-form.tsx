'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, Save, ExternalLink, Camera } from 'lucide-react';
import NextImage from 'next/image';
import { useProfile } from '@/hooks/use-profile';
import { useWeb3Auth } from '@/lib/web3auth';

/**
 * Profile Settings Form (Web3Auth mode)
 *
 * Uses useProfile hook which:
 * - Syncs user to DB on mount
 * - Provides updateProfile function
 * - Caches with React Query
 */
export function ProfileSettingsForm() {
  const { profile, isLoading, updateProfile } = useProfile();
  const { user } = useWeb3Auth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [useFullNameAsDisplay, setUseFullNameAsDisplay] = useState(false);

  // Track if user has modified the form
  const isDirtyRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<{
    base64: string;
    type: string;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize form from profile
  useEffect(() => {
    if (!profile || isDirtyRef.current) return;

    setFirstName(profile.firstName || '');
    setLastName(profile.lastName || '');
    setUsername(profile.username || '');
    setDisplayName(profile.name || '');

    const fullName = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    setUseFullNameAsDisplay(profile.name === fullName && fullName !== '');

    if (!isInitialized) setIsInitialized(true);
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
  const displayImage = imagePreview || profile?.avatarUrl;

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
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const finalDisplayName = useFullNameAsDisplay
        ? computedFullName || null
        : displayName || null;

      // Upload image to R2 if changed
      let avatarUrl: string | undefined;
      if (imageFile && user?.walletAddress) {
        const uploadRes = await fetch('/api/web3auth/upload-avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: user.walletAddress,
            imageBase64: imageFile.base64,
            imageType: imageFile.type,
          }),
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to upload image');
        }

        const uploadData = await uploadRes.json();
        avatarUrl = uploadData.url;
      }

      await updateProfile({
        username: username || null,
        name: finalDisplayName,
        firstName: firstName || null,
        lastName: lastName || null,
        avatarUrl,
      });

      setSuccess(true);
      setImageFile(null);
      setImagePreview(null);
      isDirtyRef.current = false;

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('[Settings] Error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-12 text-zinc-400">
        Please connect your wallet to access settings.
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
          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Camera className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="flex-1 space-y-1">
          <h3 className="text-lg font-medium text-white">{displayLabel}</h3>
          <p className="text-xs text-zinc-500">
            Click the avatar to upload a new photo.
          </p>
          {profile.walletAddress && (
            <a
              href={`https://polygonscan.com/address/${profile.walletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-mono text-zinc-400 hover:text-purple-400 transition-colors"
            >
              {profile.walletAddress.slice(0, 6)}...
              {profile.walletAddress.slice(-4)}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Username */}
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
          disabled={isSaving}
          className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all placeholder:text-zinc-600 disabled:opacity-50"
          placeholder="e.g. SatoshiNakamoto"
          maxLength={30}
        />
        <p className="text-xs text-zinc-500">
          Your unique handle. Visible at /u/{username || 'username'}
        </p>
      </div>

      {/* First Name & Last Name */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-zinc-400"
          >
            First Name (Optional)
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              isDirtyRef.current = true;
            }}
            disabled={isSaving}
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
            Last Name (Optional)
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              isDirtyRef.current = true;
            }}
            disabled={isSaving}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all placeholder:text-zinc-600 disabled:opacity-50"
            placeholder="e.g. Nakamoto"
            maxLength={50}
          />
        </div>
      </div>

      {/* Display Name Toggle */}
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
            disabled={isSaving}
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
              disabled={isSaving}
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
        disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? (
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
    </form>
  );
}
