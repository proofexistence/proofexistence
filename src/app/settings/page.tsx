'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ClientSettingsWrapper } from '@/components/settings/client-settings-wrapper';
import { PageHeader } from '@/components/layout/page-header';
import { useWeb3Auth } from '@/lib/web3auth';

export default function SettingsPage() {
  const router = useRouter();
  const { isLoading, isConnected } = useWeb3Auth();

  useEffect(() => {
    if (isLoading) return;

    if (!isConnected) {
      router.push('/');
    }
  }, [router, isLoading, isConnected]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!isConnected) {
    return null;
  }

  return (
    <div className="min-h-screen bg-transparent pt-48 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Settings"
          description="Manage your profile and account preferences."
        />

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            Profile Information
          </h2>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <ClientSettingsWrapper />
          </div>
        </section>
      </div>
    </div>
  );
}
