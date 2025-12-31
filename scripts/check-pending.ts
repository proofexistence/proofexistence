import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  const { db } = await import('../src/db');
  const { sessions } = await import('../src/db/schema');
  const { eq, sql } = await import('drizzle-orm');

  const pending = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(sessions)
    .where(eq(sessions.status, 'PENDING'));

  console.log('PENDING sessions:', pending[0].count);

  const sample = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      status: sessions.status,
      startTime: sessions.startTime,
    })
    .from(sessions)
    .where(eq(sessions.status, 'PENDING'))
    .limit(3);

  console.log('Sample:', JSON.stringify(sample, null, 2));
  process.exit(0);
}

main();
