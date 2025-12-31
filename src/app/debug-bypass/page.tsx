'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DebugPage() {
  const router = useRouter();

  useEffect(() => {
    localStorage.setItem('bypass_launch', 'true');
    alert('Bypass enabled! You can now access the canvas and full site.');
    router.push('/');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white p-4 text-center">
      <p>Enabling debug mode...</p>
    </div>
  );
}
