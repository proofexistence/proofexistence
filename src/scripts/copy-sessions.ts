import { Pool } from '@neondatabase/serverless';

const SOURCE_DB_URL =
  'postgresql://neondb_owner:npg_Xjf24AyEJbYt@ep-lucky-surf-a1ayv2gp-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const DEST_DB_URL =
  'postgresql://neondb_owner:npg_Xjf24AyEJbYt@ep-patient-union-a1o9qyid-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
  console.log('🚀 Starting migration (Batch Mode)...');

  const sourcePool = new Pool({ connectionString: SOURCE_DB_URL });
  const destPool = new Pool({ connectionString: DEST_DB_URL });

  try {
    console.log('📡 Fetching sessions from Staging...');
    const { rows: sessions } = await sourcePool.query('SELECT * FROM sessions');
    console.log(`✅ Found ${sessions.length} sessions.`);

    if (sessions.length === 0) return;

    console.log('💾 Inserting into Production...');

    let successCount = 0;
    let errorCount = 0;
    const BATCH_SIZE = 100; // Smaller batch to avoid query length limits if any

    for (let i = 0; i < sessions.length; i += BATCH_SIZE) {
      const batch = sessions.slice(i, i + BATCH_SIZE);
      console.log(
        `   Processing batch ${Math.floor(i / BATCH_SIZE) + 1} / ${Math.ceil(sessions.length / BATCH_SIZE)} (${batch.length} items)...`
      );

      // Assume uniform structure
      const keys = Object.keys(batch[0]);
      const values: unknown[] = [];
      const rowPlaceholders: string[] = [];

      batch.forEach((session) => {
        // Flatten values
        const rowParams = keys.map(
          (_, colIndex) => `$${values.length + colIndex + 1}`
        );
        rowPlaceholders.push(`(${rowParams.join(', ')})`);
        keys.forEach((key) =>
          values.push((session as Record<string, unknown>)[key])
        );
      });

      const query = `
        INSERT INTO sessions (${keys.map((k) => `"${k}"`).join(', ')})
        VALUES ${rowPlaceholders.join(', ')}
        ON CONFLICT ("id") DO NOTHING
      `;

      try {
        const result = await destPool.query(query, values);
        successCount += result.rowCount || 0;
      } catch (err: unknown) {
        const error = err as { message?: string; code?: string };
        errorCount += batch.length;
        console.error(`❌ Batch failed:`, error.message);
        if (error.code === '23503')
          console.error('   -> FK Violation (Users missing?)');
      }
    }

    console.log('------------------------------------------------');
    console.log(
      `🎉 Complete. Inserted: ${successCount}. Failures: ${errorCount}.`
    );
    console.log('------------------------------------------------');
  } catch (error) {
    console.error('Fatal:', error);
  } finally {
    await sourcePool.end();
    await destPool.end();
  }
}

main();
