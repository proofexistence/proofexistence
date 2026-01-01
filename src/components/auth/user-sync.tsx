'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';

export function UserSync() {
  const { user, isSignedIn, isLoaded } = useUser();
  const hasSyncedRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    // Debounce/Prevent double firing in React Strict Mode
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    const syncUser = async (): Promise<boolean> => {
      try {
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
          return true;
        } else {
          // Log non-OK responses (rate limit, server error, etc.)
          const errorData = await res.json().catch(() => ({}));
          console.error('[UserSync] Sync failed:', res.status, errorData);
          return false;
        }
      } catch (err) {
        console.error('[UserSync] Network error:', err);
        return false;
      }
    };

    const attemptSync = async () => {
      const success = await syncUser();

      // Retry on failure (with exponential backoff)
      if (!success && retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        const delay = Math.pow(2, retryCountRef.current) * 1000; // 2s, 4s, 8s
        console.log(
          `[UserSync] Retrying in ${delay / 1000}s (attempt ${retryCountRef.current}/${MAX_RETRIES})`
        );
        setTimeout(attemptSync, delay);
      }
    };

    attemptSync();
  }, [isLoaded, isSignedIn, user]);

  return null;
}
