import { getDb } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string) {
  const database = getDb();
  if (!database) {
    return { id: 0, uid, email, createdAt: new Date() };
  }
  const result = await database.insert(users)
    .values({
      uid,
      email,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
      },
    })
    .returning();

  return result[0];
}

