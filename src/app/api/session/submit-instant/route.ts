import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, sessions, badges, userBadges } from '@/db/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import { uploadToIrys } from '@/lib/irys';
import { checkRateLimit } from '@/lib/ratelimit';
import { getCurrentUser } from '@/lib/auth/get-user';

export async function POST(req: NextRequest) {
  try {
    // 1. Auth Check
    const authenticatedUser = await getCurrentUser();

    if (!authenticatedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1.5 Rate Limit Check
    const { success } = await checkRateLimit(authenticatedUser.walletAddress);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // 2. Parse Body
    // Force new version
    const body = await req.json();
    const {
      sessionId,
      imageData,
      message,
      color,
      username,
      title,
      description,
      existingArweaveTxId,
    } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' },
        { status: 400 }
      );
    }

    // 3. Fetch Session Data
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const userId = session.userId; // Need for badges

    // 3.5 Verify Ownership
    if (authenticatedUser.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Session ownership mismatch' },
        { status: 403 }
      );
    }

    // Only update the display name if the user is currently Anonymous
    // This prevents overwriting a custom display name with a potentially different one from the client
    if (
      username &&
      (!authenticatedUser.name || authenticatedUser.name === 'Anonymous')
    ) {
      await db
        .update(users)
        .set({ name: username })
        .where(eq(users.id, userId));
    }

    // 4. Upload to Arweave (via Irys)
    let arweaveTxId = '';
    let imageTxId = '';

    if (existingArweaveTxId) {
      arweaveTxId = existingArweaveTxId;
      // We assume imageTxId is inside the metadata of arweaveTxId, so we don't strictly need it here
      // unless we want to return it in debug.
    } else {
      // Mocking for dev if no key is present to prevent crash
      // OR if we are in strict development mode where we don't want to spend real mainnet funds
      // Mocking for dev ONLY if no key is present
      // Removed strict DEV mode check to allow real testing
      if (!process.env.PRIVATE_KEY && !process.env.IRYS_PRIVATE_KEY) {
        console.warn(
          'Skipping Irys upload: IRYS_PRIVATE_KEY not set or DEV mode. Returning mock TXID.'
        );
        arweaveTxId = 'mock_arweave_tx_' + Date.now();
        imageTxId = 'mock_image_tx_' + Date.now(); // Also mock image ID
      } else {
        // PROD: Real Upload
        if (!imageData || typeof imageData !== 'string') {
          return NextResponse.json(
            { error: 'Missing image data for Instant Proof' },
            { status: 400 }
          );
        }

        const base64Data = imageData.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');

        // A. Upload Image (Required)
        try {
          imageTxId = await uploadToIrys(buffer, [
            { name: 'Content-Type', value: 'image/jpeg' },
            { name: 'App-Name', value: 'ProofOfExistence2026' },
          ]);
        } catch (imgError: unknown) {
          console.error('Image upload failed:', imgError);
          throw new Error(
            `Image upload failed: ${
              imgError instanceof Error ? imgError.message : String(imgError)
            }`
          );
        }

        // B. Construct Metadata (Standard NFT)
        const metadataName =
          title || `${username || 'Anonymous'}'s Proof of Existence`;
        let metadataDescription =
          description || 'A permanent proof of digital existence.';

        if (message) {
          metadataDescription += `\n\n"${message}"`;
        }

        const metadata = {
          name: metadataName,
          description: metadataDescription,
          image: `https://gateway.irys.xyz/${imageTxId}`, // Use gateway URL for immediate OpenSea compatibility
          external_url: `https://proofofexistence.com/proof/${session.id}`,
          attributes: [
            { trait_type: 'Artist', value: username || 'Anonymous' },
            { trait_type: 'Duration', value: session.duration + 's' },
            { trait_type: 'Sector', value: session.sectorId },
            { trait_type: 'Color', value: color || '#FFFFFF' },
            {
              trait_type: 'Timestamp',
              value: new Date(session.createdAt).toISOString(),
            },
            { trait_type: 'Type', value: 'Perpetual' },
          ],
          // We also include the raw trail data in the metadata for verification!
          properties: {
            trail: session.trailData,
            userId: session.userId,
            sessionId: session.id,
            color: color,
            title: title,
            description: description,
          },
        };

        // C. Upload Metadata
        // This TXID is what the TokenURI will point to.
        arweaveTxId = await uploadToIrys(JSON.stringify(metadata), [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'App-Name', value: 'ProofOfExistence2026' },
          { name: 'Type', value: 'metadata' },
        ]);
      }
    }

    // 5. Update DB (don't set status to MINTED yet - that happens after actual minting)
    await db
      .update(sessions)
      .set({
        ipfsHash: arweaveTxId,
        message: message || null,
        title: title || null,
        description: description || null,
        color: color || null,
      })
      .where(eq(sessions.id, sessionId));

    // 6. Award Badges
    const badgeNamesToAward: string[] = [];
    const now = new Date();

    // Check Genesis Pioneer (Before Jan 1, 2026)
    if (now.getFullYear() < 2026) {
      badgeNamesToAward.push('Genesis Pioneer');
    }

    // Check First Spark (First session)
    const sessionCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessions)
      .where(eq(sessions.userId, userId));

    if (sessionCount[0].count === 1) {
      badgeNamesToAward.push('First Spark');
    }

    if (session.duration > 600) {
      // 10 minutes
      badgeNamesToAward.push('Void Walker');
    }

    // Award badges
    if (badgeNamesToAward.length > 0) {
      const badgeDefs = await db
        .select()
        .from(badges)
        .where(inArray(badges.name, badgeNamesToAward));

      for (const badgeDef of badgeDefs) {
        await db
          .insert(userBadges)
          .values({
            userId: userId,
            badgeId: badgeDef.id,
            awardedAt: new Date(),
          })
          .onConflictDoNothing();
      }
    }

    // 7. Generate Signature (Mock for now)
    const signature = '0x' + Array(130).fill('0').join('');

    return NextResponse.json({
      success: true,
      arweaveTxId,
      signature,
      proofData: {
        user: session.userId,
        startTime: Math.floor(new Date(session.startTime).getTime() / 1000),
        duration: session.duration,
        sectorId: session.sectorId,
        ipfsHash: arweaveTxId,
      },
      debug: {
        imageTxId,
        hasImageData: !!imageData,
        imageSize:
          imageData && typeof imageData === 'string' ? imageData.length : 0,
      },
    });
  } catch (error) {
    console.error('Instant submission error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
