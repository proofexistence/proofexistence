import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/db';
import { defaultThemes, badges, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// 52 weekly themes - one for each week of the year
const DEFAULT_THEMES = [
  // Week 1-13: Winter/Spring themes
  { theme: 'New Beginning', description: 'Fresh start, blank canvas, potential' },
  { theme: 'Frost', description: 'Ice crystals, winter beauty, stillness' },
  { theme: 'Reflection', description: 'Mirror, introspection, self-discovery' },
  { theme: 'Warmth', description: 'Cozy moments, inner fire, comfort' },
  { theme: 'Awakening', description: 'Spring emergence, renewal, rebirth' },
  { theme: 'Flow', description: 'Water movement, rivers, streams' },
  { theme: 'Growth', description: 'Seeds sprouting, development, progress' },
  { theme: 'Blossom', description: 'Flowers blooming, beauty unfolding' },
  { theme: 'Rain', description: 'Droplets, cleansing, nourishment' },
  { theme: 'Dawn', description: 'Sunrise, new day, hope' },
  { theme: 'Roots', description: 'Foundation, ancestry, connection' },
  { theme: 'Breeze', description: 'Gentle wind, lightness, freedom' },
  { theme: 'Meadow', description: 'Open fields, wildflowers, serenity' },
  // Week 14-26: Spring/Summer themes
  { theme: 'Sunshine', description: 'Bright light, warmth, joy' },
  { theme: 'Garden', description: 'Cultivation, care, beauty' },
  { theme: 'Adventure', description: 'Exploration, discovery, excitement' },
  { theme: 'Ocean', description: 'Waves, depths, marine wonder' },
  { theme: 'Sky', description: 'Clouds, vastness, infinity' },
  { theme: 'Forest', description: 'Trees, nature, wilderness' },
  { theme: 'Mountain', description: 'Peaks, strength, achievement' },
  { theme: 'Desert', description: 'Sand, endurance, simplicity' },
  { theme: 'Island', description: 'Solitude, paradise, escape' },
  { theme: 'Stars', description: 'Night sky, dreams, wonder' },
  { theme: 'Moon', description: 'Cycles, mystery, reflection' },
  { theme: 'Thunder', description: 'Power, release, transformation' },
  { theme: 'Rainbow', description: 'Colors, hope, promise' },
  // Week 27-39: Summer/Autumn themes
  { theme: 'Horizon', description: 'Distance, possibility, future' },
  { theme: 'Journey', description: 'Path, travel, experience' },
  { theme: 'Freedom', description: 'Liberation, wings, soaring' },
  { theme: 'Music', description: 'Rhythm, melody, harmony' },
  { theme: 'Dance', description: 'Movement, expression, joy' },
  { theme: 'Harvest', description: 'Abundance, gratitude, reward' },
  { theme: 'Gold', description: 'Autumn leaves, treasure, value' },
  { theme: 'Wind', description: 'Change, movement, transition' },
  { theme: 'Ember', description: 'Glowing warmth, fading fire' },
  { theme: 'Twilight', description: 'Dusk, transition, magic hour' },
  { theme: 'Memory', description: 'Nostalgia, moments, feelings' },
  { theme: 'Gratitude', description: 'Thankfulness, appreciation, blessing' },
  { theme: 'Connection', description: 'Bonds, relationships, unity' },
  // Week 40-52: Autumn/Winter themes
  { theme: 'Mystery', description: 'Unknown, curiosity, secrets' },
  { theme: 'Shadow', description: 'Darkness, contrast, depth' },
  { theme: 'Silence', description: 'Stillness, peace, meditation' },
  { theme: 'Fire', description: 'Flames, passion, energy' },
  { theme: 'Night', description: 'Darkness, rest, dreams' },
  { theme: 'Snow', description: 'White blanket, purity, quiet' },
  { theme: 'Light', description: 'Brightness, hope, clarity' },
  { theme: 'Celebration', description: 'Joy, festivity, togetherness' },
  { theme: 'Gift', description: 'Giving, receiving, generosity' },
  { theme: 'Home', description: 'Comfort, belonging, safety' },
  { theme: 'Love', description: 'Heart, connection, emotion' },
  { theme: 'Peace', description: 'Calm, serenity, balance' },
  { theme: 'Hope', description: 'Anticipation, faith, tomorrow' },
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
