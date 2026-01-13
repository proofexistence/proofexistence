import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/db';
import { defaultThemes, badges, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const DEFAULT_THEMES = [
  { theme: 'Ocean', description: 'Waves, depths, marine life' },
  { theme: 'Galaxy', description: 'Stars, nebulae, cosmic wonder' },
  { theme: 'Forest', description: 'Trees, nature, growth' },
  { theme: 'City', description: 'Urban landscape, lights, architecture' },
  { theme: 'Dreams', description: 'Abstract, surreal, imagination' },
  { theme: 'Time', description: 'Past, present, future' },
  { theme: 'Music', description: 'Rhythm, melody, sound waves' },
  { theme: 'Journey', description: 'Path, adventure, exploration' },
  { theme: 'Memory', description: 'Nostalgia, moments, feelings' },
  { theme: 'Fire', description: 'Flames, warmth, energy' },
  { theme: 'Wind', description: 'Flow, movement, freedom' },
  { theme: 'Earth', description: 'Ground, stability, foundation' },
  { theme: 'Love', description: 'Connection, heart, emotion' },
  { theme: 'Light', description: 'Brightness, hope, clarity' },
  { theme: 'Shadow', description: 'Mystery, contrast, depth' },
  { theme: 'Peace', description: 'Calm, serenity, balance' },
  { theme: 'Storm', description: 'Power, chaos, release' },
  { theme: 'Home', description: 'Comfort, belonging, safety' },
  { theme: 'Future', description: 'Tomorrow, possibility, change' },
  { theme: 'Spirit', description: 'Soul, essence, being' },
];

const QUEST_BADGES = [
  { id: 'streak-7', name: 'Seven Days', description: '7-day streak' },
  { id: 'streak-30', name: 'Monthly Guardian', description: '30-day streak' },
  { id: 'streak-100', name: 'Century Legend', description: '100-day streak' },
  {
    id: 'theme-first',
    name: 'Theme Pioneer',
    description: 'First theme creation',
  },
  {
    id: 'theme-master',
    name: 'Theme Master',
    description: '30 theme creations',
  },
  {
    id: 'social-butterfly',
    name: 'Social Butterfly',
    description: '100 likes given',
  },
];

export async function POST() {
  try {
    // 1. Authenticate
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // 2. Authorize (Check Admin Status)
    const dbUser = await db.query.users.findFirst({
      where: eq(users.walletAddress, currentUser.walletAddress),
      columns: { isAdmin: true },
    });

    if (!dbUser?.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Not an admin' },
        { status: 403 }
      );
    }

    // 3. Seed default themes
    const themesResult = await db
      .insert(defaultThemes)
      .values(DEFAULT_THEMES.map((t) => ({ ...t, isActive: true })))
      .onConflictDoNothing()
      .returning();

    // 4. Seed badges
    const badgesResult = await db
      .insert(badges)
      .values(QUEST_BADGES)
      .onConflictDoNothing()
      .returning();

    return NextResponse.json({
      success: true,
      themesAdded: themesResult.length,
      badgesAdded: badgesResult.length,
    });
  } catch (error) {
    console.error('Seed Themes Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
