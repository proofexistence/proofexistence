import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { sessionId, txHash } = await req.json();

    if (!sessionId || !txHash) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update Session
    await db
      .update(sessions)
      .set({
        status: 'MINTED',
        txHash: txHash,
      })
      .where(eq(sessions.id, sessionId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Finalize Mint Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
