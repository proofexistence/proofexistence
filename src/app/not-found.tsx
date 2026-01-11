'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

const Lottie404 = dynamic(
  () => import('@/components/ui/lottie-404').then((mod) => mod.Lottie404),
  {
    ssr: false,
  }
);

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <Lottie404 />

        <h1 className="text-4xl md:text-5xl font-bold text-white mt-8 mb-4">
          Page Not Found
        </h1>

        <p className="text-zinc-400 text-lg mb-8 max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-full hover:scale-105 transition-transform"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
