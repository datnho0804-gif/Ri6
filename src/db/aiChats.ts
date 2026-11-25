import type { AiChat } from '../types/models';
import { db, type Ri6Database } from './database';

/** Maximum local-only AI conversations retained in Dexie `aiChats` (SPEC M7). */
export const MAX_AI_CHATS = 50;

export async function listAiChats(database: Ri6Database = db): Promise<AiChat[]> {
  return database.aiChats.orderBy('updatedAt').reverse().limit(MAX_AI_CHATS).toArray();
}

/**
 * Saves an AI conversation locally and prunes the oldest conversations beyond MAX_AI_CHATS (50).
 * Never synced to GitHub and never included in JSON backups (SPEC §5 & M7).
 */
export async function saveAiChat(chat: AiChat, database: Ri6Database = db): Promise<void> {
  await database.transaction('rw', database.aiChats, async () => {
    await database.aiChats.put(chat);
    const total = await database.aiChats.count();
    if (total > MAX_AI_CHATS) {
      const oldest = await database.aiChats
        .orderBy('updatedAt')
        .limit(total - MAX_AI_CHATS)
        .primaryKeys();
      if (oldest.length > 0) {
        await database.aiChats.bulkDelete(oldest);
      }
    }
  });
}

export async function deleteAiChat(id: string, database: Ri6Database = db): Promise<void> {
  await database.aiChats.delete(id);
}
