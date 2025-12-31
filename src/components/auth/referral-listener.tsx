'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

function ReferralListenerContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      // Set cookie for 30 days
      const d = new Date();
      d.setTime(d.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expires = 'expires=' + d.toUTCString();
      document.cookie = `referral_code=${ref};${expires};path=/;SameSite=Lax`;
    }
  }, [searchParams]);

  return null;
}

export function ReferralListener() {
  return (
    <Suspense>
      <ReferralListenerContent />
    </Suspense>
  );
}
