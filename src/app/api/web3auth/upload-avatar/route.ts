import { NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/storage/r2';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ethers } from 'ethers';
import { checkRateLimit } from '@/lib/ratelimit';
import sharp from 'sharp';

/**
 * Avatar upload endpoint for Web3Auth users
 * Accepts base64 image data, compresses to WebP, and uploads to R2 storage
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { walletAddress: rawWalletAddress, imageBase64, imageType } = body;

    if (!rawWalletAddress) {
      return NextResponse.json(
        { error: 'Missing wallet address' },
        { status: 400 }
      );
    }

    if (!imageBase64 || !imageType) {
      return NextResponse.json(
        { error: 'Missing image data' },
        { status: 400 }
      );
    }

    // Normalize wallet address
    let walletAddress: string;
    try {
      walletAddress = ethers.getAddress(rawWalletAddress);
    } catch {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    // Rate limit
    const rateLimit = await checkRateLimit(`upload-avatar:${walletAddress}`);
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Verify user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.walletAddress, walletAddress),
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found. Please reconnect your wallet.' },
        { status: 404 }
      );
    }

    // Extract base64 data (remove data:image/...;base64, prefix if present)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Validate size (5MB max for input)
    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image too large (max 5MB)' },
        { status: 400 }
      );
    }

    // Compress and convert to WebP using sharp
    // Resize to max 256x256 for avatars, convert to WebP with quality 80
    const compressedBuffer = await sharp(buffer)
      .resize(256, 256, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 80 })
      .toBuffer();

    // Use wallet address as filename (overwrites previous avatar)
    const key = `avatars/${walletAddress.toLowerCase()}.webp`;

    // Upload to R2
    const publicUrl = await uploadToR2(key, compressedBuffer, 'image/webp');

    // Update user's avatar URL in database
    await db
      .update(users)
      .set({ avatarUrl: publicUrl })
      .where(eq(users.walletAddress, walletAddress));

    return NextResponse.json({
      success: true,
      url: publicUrl,
    });
  } catch (error) {
    console.error('[Upload Avatar] Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}
