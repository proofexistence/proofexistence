import { db } from '../src/db';
import { sessions } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const id = 'cd72a7d5-55df-421f-b1fa-e4473c0be374';

async function main() {
  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, id))
    .execute();
}

main()
  .catch(console.error)
  .then(() => process.exit(0));
