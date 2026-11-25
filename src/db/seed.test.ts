import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { initDatabase, Ri6Database, SCHEMA_VERSION } from './database';
import {
  createInitialLotA,
  createInitialSettings,
  createInitialTrees,
  generateDeviceId,
  INITIAL_INDIVIDUAL_TREES,
  INITIAL_LOT_A_COUNT,
  LOT_A_ID,
} from './seed';

const openedDbs: Dexie[] = [];

function createTestDb(suffix: string): Ri6Database {
  const testDb = new Ri6Database(`ri6-test-${suffix}-${Date.now()}-${Math.random()}`);
  openedDbs.push(testDb);
  return testDb;
}

afterEach(async () => {
  while (openedDbs.length > 0) {
    const instance = openedDbs.pop();
    if (instance) {
      instance.close();
      await instance.delete();
    }
  }
});

describe('database initial seed builders and Dexie v2 schema (T01 AC6, T07 AC1 & AC3)', () => {
  it('generates valid UUID v4 deviceIds', () => {
    const id = generateDeviceId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('creates clean initial SR01-SR03 trees (DEFAULT_INITIAL_TREES = 3) with id === code and LOT_A without fake history', () => {
    const trees = createInitialTrees('dev-1', '2026-11-24T00:00:00.000Z');
    expect(INITIAL_INDIVIDUAL_TREES).toBe(3);
    expect(trees).toHaveLength(3);
    expect(trees.map((t) => t.code)).toEqual(['SR01', 'SR02', 'SR03']);

    for (const tree of trees) {
      expect(tree.id).toBe(tree.code);
      expect(tree.lot).toBe('B');
      expect(tree.location).toBe('');
      expect(tree.ageYears).toBeNull();
      expect(tree.stage).toBeNull();
      expect(tree.health).toBe('tot');
      expect(tree.needsPruning).toBe(false);
      expect(tree.diseaseWatch).toBe(false);
      expect(tree.fruitCount).toBeUndefined();
      expect(tree.fruitLimit).toBeUndefined();
    }

    const lotA = createInitialLotA('dev-1', '2026-11-24T00:00:00.000Z');
    expect(lotA.id).toBe(LOT_A_ID);
    expect(lotA.treeCount).toBe(INITIAL_LOT_A_COUNT);
    expect(lotA.stage).toBeNull();

    const settings = createInitialSettings('dev-1', '0.8.0');
    expect(settings.githubToken).toBeUndefined();
    expect(settings.geminiApiKey).toBeUndefined();
    expect(settings.notify).toEqual({ enabled: false, lastKeys: [] });
    expect(settings.geminiSchemaUnsupported).toEqual([]);
  });

  it('opens Dexie v2 with all 9 SPEC §5 tables (including aiMemories) and required indexes', async () => {
    const testDb = createTestDb('schema');
    const result = await initDatabase('0.8.0', testDb);

    expect(SCHEMA_VERSION).toBe(2);
    expect(result.versionError).toBe(false);
    expect(result.tableCount).toBe(9);

    const tableNames = testDb.tables.map((t) => t.name).sort();
    expect(tableNames).toEqual([
      'aiChats',
      'aiMemories',
      'logs',
      'lots',
      'photoBlobs',
      'photos',
      'settings',
      'tasks',
      'trees',
    ]);

    // Verify required indexes on trees, logs, tasks, aiMemories
    const treeIndexes = testDb.trees.schema.indexes.map((i) => i.name);
    expect(treeIndexes).toEqual(expect.arrayContaining(['code', 'lot']));
    expect(treeIndexes).not.toContain('needsPruning');
    expect(treeIndexes).not.toContain('diseaseWatch');

    const logIndexes = testDb.logs.schema.indexes.map((i) => i.name);
    expect(logIndexes).toEqual(expect.arrayContaining(['targetId', 'date', 'type', 'batchId']));

    const taskIndexes = testDb.tasks.schema.indexes.map((i) => i.name);
    expect(taskIndexes).toEqual(expect.arrayContaining(['targetId', 'dueDate']));
    expect(taskIndexes).not.toContain('done');

    const memoryIndexes = testDb.aiMemories.schema.indexes.map((i) => i.name);
    expect(memoryIndexes).toContain('updatedAt');

    // Verify initial seeded rows (3 trees + LOT_A 50)
    expect(await testDb.trees.count()).toBe(3);
    expect((await testDb.lots.get(LOT_A_ID))?.treeCount).toBe(INITIAL_LOT_A_COUNT);
    expect((await testDb.settings.get('app'))?.deviceId).toBe(result.settings.deviceId);
  });

  it('upgrades existing Dexie v1 database (15 trees + logs) to v2 non-destructively without data loss or re-seeding (T07 AC1 & AC3)', async () => {
    const dbName = `ri6-test-upgrade-${Date.now()}-${Math.random()}`;
    const v1 = new Dexie(dbName);
    v1.version(1).stores({
      trees: 'id, code, lot, health, updatedAt, deletedAt',
      lots: 'id, updatedAt, deletedAt',
      logs: 'id, targetId, date, type, batchId, updatedAt, deletedAt',
      tasks: 'id, targetId, dueDate, updatedAt, deletedAt',
      photos: 'id, targetId, takenAt, kind, updatedAt, deletedAt',
      photoBlobs: 'id',
      settings: 'id',
      aiChats: 'id, updatedAt',
    });
    await v1.open();
    const legacyTrees = Array.from({ length: 15 }, (_, idx) => {
      const code = `SR${String(idx + 1).padStart(2, '0')}`;
      return {
        id: code,
        code,
        lot: 'B',
        label: `${code} cũ`,
        location: 'Hàng 1',
        ageYears: 4,
        stage: null,
        health: 'tot',
        needsPruning: false,
        diseaseWatch: false,
        updatedAt: '2026-11-20T00:00:00.000Z',
        updatedBy: 'legacy-dev',
      };
    });
    await v1.table('trees').bulkPut(legacyTrees);
    await v1.table('lots').put({
      id: LOT_A_ID,
      treeCount: 47,
      stage: 'coi-dot',
      updatedAt: '2026-11-20T00:00:00.000Z',
      updatedBy: 'legacy-dev',
    });
    await v1.table('logs').put({
      id: 'log-legacy-1',
      targetId: 'SR12',
      date: '2026-11-20',
      type: 'do-ph',
      soilPh: 5.8,
      note: 'Đo pH trước nâng cấp',
      updatedAt: '2026-11-20T01:00:00.000Z',
      updatedBy: 'legacy-dev',
    });
    await v1.table('settings').put({
      ...createInitialSettings('legacy-dev', '0.7.0'),
      seededAt: '2026-11-20T00:00:00.000Z',
    });
    v1.close();

    // Open same DB with v2 Ri6Database
    const v2 = new Ri6Database(dbName);
    openedDbs.push(v2);
    const res = await initDatabase('0.8.0', v2);

    expect(res.versionError).toBe(false);
    expect(res.wasUpgradedFromVersion).toBe('0.7.0');
    expect(res.tableCount).toBe(9);
    // All 15 existing trees, LOT_A count 47, and log must be untouched!
    expect(await v2.trees.count()).toBe(15);
    expect((await v2.trees.get('SR15'))?.label).toBe('SR15 cũ');
    expect((await v2.lots.get(LOT_A_ID))?.treeCount).toBe(47);
    expect((await v2.logs.get('log-legacy-1'))?.soilPh).toBe(5.8);

    // New aiMemories table is writable immediately after upgrade
    await v2.aiMemories.put({
      id: 'mem-1',
      category: 'kinh-nghiem',
      content: 'Đất góc đông giữ ẩm lâu hơn',
      source: 'manual',
      approved: true,
      createdAt: '2026-11-25T00:00:00.000Z',
      updatedAt: '2026-11-25T00:00:00.000Z',
      updatedBy: 'legacy-dev',
    });
    expect(await v2.aiMemories.count()).toBe(1);
  });

  it('does NOT re-seed when DB already has data, even after adding or deleting trees', async () => {
    const testDb = createTestDb('idempotent');
    const first = await initDatabase('0.8.0', testDb);
    const deviceId = first.settings.deviceId;

    // 1. Add a new tree (SR04) and delete SR01 + update LOT_A treeCount
    await testDb.trees.put({
      id: 'uuid-tree-04',
      code: 'SR04',
      lot: 'A',
      label: 'SR04 - Hàng mới',
      location: 'Góc vườn',
      ageYears: 2,
      stage: 'coi-dot',
      health: 'tot',
      needsPruning: false,
      diseaseWatch: false,
      updatedAt: '2026-11-24T01:00:00.000Z',
      updatedBy: deviceId,
    });
    await testDb.trees.delete('SR01');
    await testDb.lots.update(LOT_A_ID, { treeCount: 49 });

    // Re-run initDatabase: SR01 must stay deleted, SR04 must stay, LOT_A must stay 49
    const second = await initDatabase('0.8.0', testDb);
    expect(second.settings.deviceId).toBe(deviceId);
    expect(await testDb.trees.get('SR01')).toBeUndefined();
    expect((await testDb.trees.get('uuid-tree-04'))?.code).toBe('SR04');
    expect(await testDb.trees.count()).toBe(INITIAL_INDIVIDUAL_TREES); // 3 - 1 + 1
    expect((await testDb.lots.get(LOT_A_ID))?.treeCount).toBe(49);

    // 2. Even if ALL trees are deleted, seed must NOT run again
    await testDb.trees.clear();
    const third = await initDatabase('0.8.0', testDb);
    expect(third.treeCount).toBe(0);
    expect(await testDb.trees.count()).toBe(0);
  });
});
