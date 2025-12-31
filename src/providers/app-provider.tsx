'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { dark } from '@clerk/themes';
import { UserSync } from '@/components/auth/user-sync';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

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
