import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/storage/r2';
import { db } from '@/db';
import { sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;

    if (!file || !sessionId) {
      return NextResponse.json(
        { error: 'Missing file or sessionId' },
        { status: 400 }
      );
    }

    // Validate request body
    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      return NextResponse.json(
        { error: 'File size too large (max 5MB)' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate a unique key for the file
    // Structure: proofs/{sessionId}/preview.webp or just proofs/{sessionId}.webp
    // Using timestamp to avoid caching issues if re-uploaded
    const timestamp = Date.now();
    const key = `proofs/${sessionId}/preview-${timestamp}.webp`;

    // Upload to R2
    const publicUrl = await uploadToR2(key, buffer, 'image/webp');

    // Update the database
    await db
      .update(sessions)
      .set({ previewUrl: publicUrl })
      .where(eq(sessions.id, sessionId));

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing upload' },
      { status: 500 }
    );
  }
}
