import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sessions, users } from '../src/db/schema';
import * as schema from '../src/db/schema';
import { config } from 'dotenv';

config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const TOTAL_SESSIONS = 3500; // Adding more to reach ~5000 total
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function randomDate(start: Date, end: Date) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

function randomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Generate a random trail path
function generateTrailData() {
  const points = [];
  let x = (Math.random() - 0.5) * 10;
  let y = (Math.random() - 0.5) * 10;
  let z = (Math.random() - 0.5) * 2;
  const length = 5 + Math.floor(Math.random() * 20);

  for (let i = 0; i < length; i++) {
    x += Math.random() - 0.5;
    y += Math.random() - 0.5;
    z += (Math.random() - 0.5) * 0.1;
    points.push({ x, y, z });
  }
  return points;
}

async function main() {
  // 1. Ensure we have a mock user
  let userId = '';
  const existingUser = await db.query.users.findFirst();
  if (existingUser) {
    userId = existingUser.id;
  } else {
    const newUser = await db
      .insert(users)
      .values({
        clerkId: 'mock_clerk_' + Math.floor(Math.random() * 10000),
        walletAddress:
          '0xMockUserForSeeding' + Math.floor(Math.random() * 10000),
        name: 'Quantum Seeder',
      })
      .returning();
    userId = newUser[0].id;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: any[] = [];
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - ONE_YEAR_MS);

  for (let i = 0; i < TOTAL_SESSIONS; i++) {
    const createdAt = randomDate(oneYearAgo, now);
    // 50% chance of being "Settled" (permanent)
    const status = Math.random() > 0.5 ? 'SETTLED' : 'MINTED';
    const duration = 10 + Math.floor(Math.random() * 300); // 10s to 5m

    values.push({
      userId: userId,
      startTime: createdAt,
      duration: duration,
      sectorId: 1,
      trailData: generateTrailData(),
      color: randomColor(),
      status: status,
      createdAt: createdAt,
      title: `Mock Session #${i}`,
      views: Math.floor(Math.random() * 100),
    });
  }

  // Insert in batches of 100 to avoid limits
  const BATCH_SIZE = 100;
  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);
    await db.insert(sessions).values(batch);
    process.stdout.write(`.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
