import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/db';
import { dailyThemes, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    const dbUser = await db.query.users.findFirst({
      where: eq(users.walletAddress, currentUser.walletAddress),
      columns: { id: true, isAdmin: true },
    });

    if (!dbUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { date, theme, description } = await req.json();
    if (!date || !theme) {
      return NextResponse.json(
        { error: 'Date and theme required' },
        { status: 400 }
      );
    }

    const [override] = await db
      .insert(dailyThemes)
      .values({
        date,
        theme,
        description,
        isDefault: false,
        createdBy: dbUser.id,
      })
      .onConflictDoUpdate({
        target: dailyThemes.date,
        set: { theme, description, isDefault: false, createdBy: dbUser.id },
      })
      .returning();

    return NextResponse.json({ override });
  } catch (error) {
    console.error('POST override error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
