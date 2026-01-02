'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { dark } from '@clerk/themes';
import { UserSync } from '@/components/auth/user-sync';
import { Web3AuthProvider } from '@/lib/web3auth';

// Feature flag for Web3Auth migration
const USE_WEB3AUTH = process.env.NEXT_PUBLIC_USE_WEB3AUTH === 'true';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // Web3Auth mode - sync happens in useProfile hook
  if (USE_WEB3AUTH) {
    return (
      <Web3AuthProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </Web3AuthProvider>
    );
  }

  // Default: Clerk mode
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: { colorPrimary: '#7C3AED' },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <UserSync />
        {children}
      </QueryClientProvider>
    </ClerkProvider>
  );
}
