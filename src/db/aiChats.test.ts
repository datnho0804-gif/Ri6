import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import type { AiChat } from '../types/models';
import { deleteAiChat, listAiChats, MAX_AI_CHATS, saveAiChat } from './aiChats';
import { initDatabase, Ri6Database } from './database';

describe('Dexie aiChats local history (T06 AC4)', () => {
  const dbs: Ri6Database[] = [];

  afterEach(async () => {
    for (const d of dbs.splice(0)) {
      d.close();
      await d.delete();
    }
  });

  it('saves, lists newest first, deletes, and caps retention at 50 conversations', async () => {
    const testDb = new Ri6Database(`ri6-ai-chats-${crypto.randomUUID()}`);
    dbs.push(testDb);
    await initDatabase('0.7.0', testDb);

    for (let i = 1; i <= 55; i += 1) {
      const ts = new Date(Date.UTC(2026, 10, 1, 0, i, 0)).toISOString();
      const chat: AiChat = {
        id: `chat-${i}`,
        title: `Hội thoại ${i}`,
        messages: [{ id: `m-${i}`, role: 'user', content: `Câu hỏi ${i}`, createdAt: ts }],
        createdAt: ts,
        updatedAt: ts,
      };
      await saveAiChat(chat, testDb);
    }

    const list = await listAiChats(testDb);
    expect(list).toHaveLength(MAX_AI_CHATS);
    expect(list[0].id).toBe('chat-55');
    expect(list[list.length - 1].id).toBe('chat-6');

    await deleteAiChat('chat-55', testDb);
    const afterDelete = await listAiChats(testDb);
    expect(afterDelete).toHaveLength(MAX_AI_CHATS - 1);
    expect(afterDelete.find((c) => c.id === 'chat-55')).toBeUndefined();
  });
});
