'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isLaunchTime } from '@/lib/launch-config';

const POECanvas = dynamic(
  () => import('@/components/canvas/poe-canvas').then((mod) => mod.POECanvas),
  {
    ssr: false,
    loading: () => <div className="w-full h-screen bg-black" />,
  }
);

export default function CanvasPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isLaunchTime()) {
      router.push('/');
    } else {
      // eslint-disable-next-line
      setAuthorized(true);
    }
    setIsChecking(false);
  }, [router]);

  if (isChecking || !authorized)
    return <div className="w-full h-screen bg-black" />;

  return <POECanvas />;
}
