import { NextResponse } from 'next/server';
import { db } from '@/db';
import { badges } from '@/db/schema';

export async function GET() {
  try {
    const predefinedBadges = [
      {
        id: 'genesis-pioneer',
        name: 'Genesis Pioneer',
        description: 'Minted a proof before the official 2026 launch.',
        imageUrl: '/badges/genesis.png', // Placeholder
      },
      {
        id: 'first-spark',
        name: 'First Spark',
        description: 'Minted your very first Proof of Existence.',
        imageUrl: '/badges/first-spark.png',
      },
      {
        id: 'void-walker',
        name: 'Void Walker',
        description: 'Completed a session lasting over 10 minutes.',
        imageUrl: '/badges/void-walker.png',
      },
    ];

    for (const badge of predefinedBadges) {
      await db.insert(badges).values(badge).onConflictDoNothing();
    }

    return NextResponse.json({ success: true, message: 'Badges seeded' });
  } catch (error) {
    console.error('Error seeding badges:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
