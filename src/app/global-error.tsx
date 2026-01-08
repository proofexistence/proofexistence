'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="text-gray-400">
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
