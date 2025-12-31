'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';

export function UserSync() {
  const { user, isSignedIn, isLoaded } = useUser();
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    // Check if we already have the metadata.
    // We used to skip if walletAddress existed, but we need to sync
    // profile updates (images/names) too.
    // So we run this once per mount regardless.
    // const metadata = user.publicMetadata;
    // if (metadata?.walletAddress && hasSyncedRef.current) return;

    // Debounce/Prevent double firing in React Strict Mode
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    const syncUser = async () => {
      try {
        // If we already have wallet address, maybe skip?
        // But the user might be missing in local DB (if cloned fresh).
        // So let's fire it once per session/mount comfortably.

        const res = await fetch('/api/user/sync', {
          method: 'POST',
        });

        if (res.ok) {
          const data = await res.json();
          // Reload on 'created' (new user) or 'updated' (repaired metadata)
          if (
            data.success &&
            (data.status === 'created' || data.status === 'updated')
          ) {
            await user.reload();
          }
        }
      } catch (err) {
        console.error('[UserSync] Failed to sync user:', err);
      }
    };

    syncUser();
  }, [isLoaded, isSignedIn, user]);

  return null;
}
