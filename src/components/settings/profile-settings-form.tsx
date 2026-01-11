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
  const {
    profile,
    isLoading,
    updateProfile,
    uploadAvatar,
    isUpdating,
    isUploading,
  } = useProfile();
  const { user } = useWeb3Auth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Track if user has modified the form
  const isDirtyRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<{
    base64: string;
    type: string;
  } | null>(null);

  // const [isSaving, setIsSaving] = useState(false); // Removed separate state, use hook state if desired, but for now we might keep local saving state to combine both
  const isSaving = isUpdating || isUploading;
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize form from profile
  useEffect(() => {
    if (!profile || isDirtyRef.current) return;

    setUsername(profile.username || '');
    setDisplayName(profile.name || '');

    if (!isInitialized) setIsInitialized(true);
  }, [profile, isInitialized]);

  // Computed values
  const displayLabel = displayName || 'Anonymous';
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
    // setIsSaving(true); // handled by hook state derived above
    setError(null);
    setSuccess(false);

    try {
      // Upload image to R2 if changed
      // Upload image to R2 if changed
      let avatarUrl: string | undefined;
      if (imageFile && user?.walletAddress) {
        avatarUrl = await uploadAvatar({
          imageBase64: imageFile.base64,
          imageType: imageFile.type,
        });
      }

      await updateProfile({
        username: username || null,
        name: displayName || null,
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
      // setIsSaving(false);
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

      {/* Display Name */}
      <div className="space-y-2">
        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-zinc-400"
        >
          Display Name
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
          placeholder="e.g. Satoshi Nakamoto"
          maxLength={50}
        />
        <p className="text-xs text-zinc-500">
          Your public display name. Shows as &quot;Anonymous&quot; if empty.
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
