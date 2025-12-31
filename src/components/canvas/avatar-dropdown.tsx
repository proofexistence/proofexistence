'use client';

import { useUser, useClerk } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Settings, LogOut, User } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function AvatarDropdown() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut, openSignIn } = useClerk();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Get wallet from metadata
  const walletAddress = (
    user?.publicMetadata as { walletAddress?: string } | undefined
  )?.walletAddress;

  // Fetch user profile
  useEffect(() => {
    async function fetchProfile() {
      if (isLoaded && isSignedIn && walletAddress) {
        try {
          const res = await fetch(`/api/profile/${walletAddress}`);
          if (res.ok) {
            const data = await res.json();
            if (data.user?.name) setDisplayName(data.user.name);
            if (data.user?.username) setUsername(data.user.username);
            if (data.user?.imageUrl) setUserImage(data.user.imageUrl);
          }
        } catch (err) {
          console.error('Failed to fetch profile for avatar dropdown', err);
        }
      }
    }

    fetchProfile();

    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail === 'string') {
        setUserImage(customEvent.detail);
      }
      fetchProfile();
    };
    window.addEventListener('profile-updated', handleUpdate);

    return () => {
      window.removeEventListener('profile-updated', handleUpdate);
    };
  }, [isLoaded, isSignedIn, walletAddress]);

  if (!isLoaded) return null;

  return (
    <div className="relative z-50 pointer-events-auto">
      {isSignedIn ? (
        <div
          className="relative"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {/* Avatar Button */}
          <Link
            href={
              username
                ? `/u/${username}`
                : walletAddress
                  ? `/u/${walletAddress}`
                  : '#'
            }
            className="block relative w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 hover:border-white/50 transition-colors shadow-lg shadow-black/20"
          >
            {user?.imageUrl || userImage ? (
              <Image
                src={user?.imageUrl || userImage || ''}
                alt="Profile"
                fill
                sizes="44px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-black/40 backdrop-blur-xl flex items-center justify-center">
                <User className="w-5 h-5 text-white/70" />
              </div>
            )}
          </Link>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-48 py-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl origin-top-right overflow-hidden"
              >
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                  <div className="text-xs font-bold text-white mb-0.5 truncate">
                    {displayName || 'User'}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400 truncate">
                    {walletAddress}
                  </div>
                </div>

                <Link
                  href="/settings"
                  className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2.5"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <button
                  onClick={async () => {
                    await signOut();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2.5"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <button
          onClick={() => openSignIn()}
          className="bg-black/20 hover:bg-black/40 backdrop-blur-xl text-white font-medium px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 transition-all shadow-lg active:scale-95 text-sm"
        >
          Login
        </button>
      )}
    </div>
  );
}
