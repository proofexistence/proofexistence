import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/db';
import { defaultThemes, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const { theme, description, isActive } = await req.json();

    const [updated] = await db
      .update(defaultThemes)
      .set({ theme, description, isActive })
      .where(eq(defaultThemes.id, parseInt(id)))
      .returning();

    return NextResponse.json({ theme: updated });
  } catch (error) {
    console.error('PATCH theme error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    await db.delete(defaultThemes).where(eq(defaultThemes.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE theme error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
