import { Pool } from '@neondatabase/serverless';

const DEST_DB_URL =
  'postgresql://neondb_owner:npg_Xjf24AyEJbYt@ep-patient-union-a1o9qyid-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
  const pool = new Pool({ connectionString: DEST_DB_URL });
  try {
    const res = await pool.query('SELECT count(*) FROM sessions');
    console.log(`Current Production Session Count: ${res.rows[0].count}`);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
main();
