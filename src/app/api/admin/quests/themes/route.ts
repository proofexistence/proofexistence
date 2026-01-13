import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/db';
import { defaultThemes, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    const dbUser = await db.query.users.findFirst({
      where: eq(users.walletAddress, currentUser.walletAddress),
      columns: { isAdmin: true },
    });

    if (!dbUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const themes = await db
      .select()
      .from(defaultThemes)
      .orderBy(defaultThemes.id);
    return NextResponse.json({ themes });
  } catch (error) {
    console.error('GET themes error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    const dbUser = await db.query.users.findFirst({
      where: eq(users.walletAddress, currentUser.walletAddress),
      columns: { isAdmin: true },
    });

    if (!dbUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { theme, description } = await req.json();
    if (!theme) {
      return NextResponse.json(
        { error: 'Theme name required' },
        { status: 400 }
      );
    }

    const [newTheme] = await db
      .insert(defaultThemes)
      .values({ theme, description, isActive: true })
      .returning();

    return NextResponse.json({ theme: newTheme });
  } catch (error) {
    console.error('POST theme error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
