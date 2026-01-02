'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Web3AuthProvider } from '@/lib/web3auth';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <Web3AuthProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Web3AuthProvider>
  );
}
