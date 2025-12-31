import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { syncUserToDatabase } from '@/lib/auth/sync-logic';

export async function POST() {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Logic to extract Primary Web3 Wallet if exists
    const primaryWeb3WalletId = user.primaryWeb3WalletId;
    const web3Wallet =
      user.web3Wallets.find((w) => w.id === primaryWeb3WalletId)?.web3Wallet ||
      null;

    const cookieStore = await cookies();
    const referralCode = cookieStore.get('referral_code')?.value;

    const result = await syncUserToDatabase({
      userId,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      web3Wallet: web3Wallet,
      referredByCode: referralCode,
    });

    return NextResponse.json({ success: true, status: result.status });
  } catch (error) {
    console.error('Sync API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
