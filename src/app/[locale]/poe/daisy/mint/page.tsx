import { Metadata } from 'next';
import { MintClient } from './mint-client';
import { getAvailableDates } from '@/lib/db/queries/get-sessions-by-date';

export const metadata: Metadata = {
  title: 'Mint Daisy NFT | Proof of Existence',
  description:
    'Mint your daily Daisy NFT from the collective art visualization',
};

export const dynamic = 'force-dynamic';

export default async function DaisyMintPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const availableDates = await getAvailableDates();

  // Default to yesterday
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const defaultDate = yesterday.toISOString().split('T')[0];

  const selectedDate = params.date || defaultDate;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent">
          Mint Daisy NFT
        </h1>
        <MintClient
          initialDate={selectedDate}
          availableDates={availableDates}
        />
      </div>
    </div>
  );
}
