import { eq } from 'drizzle-orm';
import type { Executor } from './db/client.ts';
import { appSetting } from './db/schema.ts';

// The owner's settings, one JSON value per key in `app_setting`.

/** The value saved under `key`, or null when none is. The caller knows the value's shape. */
export async function readSetting<T>(db: Executor, key: string): Promise<T | null> {
  const rows = await db
    .select({ value: appSetting.value })
    .from(appSetting)
    .where(eq(appSetting.key, key));
  return rows.length > 0 ? (rows[0]!.value as T) : null;
}

/** Saves `value` under `key`, replacing any earlier value. */
export async function writeSetting(db: Executor, key: string, value: unknown): Promise<void> {
  await db
    .insert(appSetting)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSetting.key, set: { value, updatedAt: new Date() } });
}

/** Removes the value saved under `key`, if any. */
export async function clearSetting(db: Executor, key: string): Promise<void> {
  await db.delete(appSetting).where(eq(appSetting.key, key));
}
