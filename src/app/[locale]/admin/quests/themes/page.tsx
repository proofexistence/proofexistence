import { Metadata } from 'next';
import { ThemeManagementClient } from './theme-management-client';
import { db } from '@/db';
import { defaultThemes, dailyThemes } from '@/db/schema';
import { gte } from 'drizzle-orm';

export const metadata: Metadata = {
  title: 'Theme Management | Admin',
};

export default async function ThemeManagementPage() {
  // Fetch default themes
  const themes = await db.select().from(defaultThemes).orderBy(defaultThemes.id);

  // Fetch upcoming overrides (next 14 days)
  const today = new Date().toISOString().split('T')[0];
  const overrides = await db
    .select()
    .from(dailyThemes)
    .where(gte(dailyThemes.date, today))
    .orderBy(dailyThemes.date)
    .limit(14);

  return <ThemeManagementClient defaultThemes={themes} overrides={overrides} />;
}
