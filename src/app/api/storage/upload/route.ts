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
    // Using timestamp to avoid caching issues if re-uploaded
    // Store with correct content-type matching the actual file format (client sends JPEG)
    const timestamp = Date.now();
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    const contentType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const key = `proofs/${sessionId}/preview-${timestamp}.${ext}`;

    // Upload to R2
    const publicUrl = await uploadToR2(key, buffer, contentType);

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
