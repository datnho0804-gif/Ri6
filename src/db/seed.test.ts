import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { initDatabase, Ri6Database } from './database';
import {
  createInitialLotA,
  createInitialSettings,
  createInitialTrees,
  generateDeviceId,
  INITIAL_INDIVIDUAL_TREES,
  INITIAL_LOT_A_COUNT,
  LOT_A_ID,
} from './seed';

const openedDbs: Ri6Database[] = [];

function createTestDb(suffix: string): Ri6Database {
  const testDb = new Ri6Database(`ri6-test-${suffix}-${Date.now()}-${Math.random()}`);
  openedDbs.push(testDb);
  return testDb;
}

afterEach(async () => {
  while (openedDbs.length > 0) {
    const instance = openedDbs.pop();
    if (instance) {
      await instance.delete();
    }
  }
});

describe('database initial seed builders and Dexie v1 schema (T01 AC6)', () => {
  it('generates valid UUID v4 deviceIds', () => {
    const id = generateDeviceId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('creates clean initial SR01-SR15 trees with id === code and LOT_A without fake history', () => {
    const trees = createInitialTrees('dev-1', '2026-11-24T00:00:00.000Z');
    expect(trees).toHaveLength(INITIAL_INDIVIDUAL_TREES);
    expect(trees[0].id).toBe('SR01');
    expect(trees[0].code).toBe('SR01');
    expect(trees[INITIAL_INDIVIDUAL_TREES - 1].id).toBe('SR15');
    expect(trees[INITIAL_INDIVIDUAL_TREES - 1].code).toBe('SR15');

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

    const settings = createInitialSettings('dev-1', '0.1.0');
    expect(settings.githubToken).toBeUndefined();
    expect(settings.geminiApiKey).toBeUndefined();
    expect(settings.notify).toEqual({ enabled: false, lastKeys: [] });
    expect(settings.geminiSchemaUnsupported).toEqual([]);
  });

  it('opens Dexie v1 with all 8 SPEC §5 tables and required indexes', async () => {
    const testDb = createTestDb('schema');
    const result = await initDatabase('0.1.0', testDb);

    expect(result.versionError).toBe(false);
    expect(result.tableCount).toBe(8);

    const tableNames = testDb.tables.map((t) => t.name).sort();
    expect(tableNames).toEqual([
      'aiChats',
      'logs',
      'lots',
      'photoBlobs',
      'photos',
      'settings',
      'tasks',
      'trees',
    ]);

    // Verify required SPEC 1.1 indexes on trees, logs, tasks (excluding boolean flags which IndexedDB cannot index)
    const treeIndexes = testDb.trees.schema.indexes.map((i) => i.name);
    expect(treeIndexes).toEqual(expect.arrayContaining(['code', 'lot']));
    expect(treeIndexes).not.toContain('needsPruning');
    expect(treeIndexes).not.toContain('diseaseWatch');

    const logIndexes = testDb.logs.schema.indexes.map((i) => i.name);
    expect(logIndexes).toEqual(expect.arrayContaining(['targetId', 'date', 'type', 'batchId']));

    const taskIndexes = testDb.tasks.schema.indexes.map((i) => i.name);
    expect(taskIndexes).toEqual(expect.arrayContaining(['targetId', 'dueDate']));
    expect(taskIndexes).not.toContain('done');

    // Verify initial seeded rows
    expect(await testDb.trees.count()).toBe(INITIAL_INDIVIDUAL_TREES);
    expect((await testDb.lots.get(LOT_A_ID))?.treeCount).toBe(INITIAL_LOT_A_COUNT);
    expect((await testDb.settings.get('app'))?.deviceId).toBe(result.settings.deviceId);
  });

  it('does NOT re-seed when DB already has data, even after adding or deleting trees', async () => {
    const testDb = createTestDb('idempotent');
    const first = await initDatabase('0.1.0', testDb);
    const deviceId = first.settings.deviceId;

    // 1. Add a new tree (SR16) and delete SR01 + update LOT_A treeCount
    await testDb.trees.put({
      id: 'uuid-tree-16',
      code: 'SR16',
      lot: 'A',
      label: 'SR16 - Hàng mới',
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

    // Re-run initDatabase: SR01 must stay deleted, SR16 must stay, LOT_A must stay 49
    const second = await initDatabase('0.1.0', testDb);
    expect(second.settings.deviceId).toBe(deviceId);
    expect(await testDb.trees.get('SR01')).toBeUndefined();
    expect((await testDb.trees.get('uuid-tree-16'))?.code).toBe('SR16');
    expect(await testDb.trees.count()).toBe(INITIAL_INDIVIDUAL_TREES); // 15 - 1 + 1
    expect((await testDb.lots.get(LOT_A_ID))?.treeCount).toBe(49);

    // 2. Even if ALL trees are deleted, seed must NOT run again
    await testDb.trees.clear();
    const third = await initDatabase('0.1.0', testDb);
    expect(third.treeCount).toBe(0);
    expect(await testDb.trees.count()).toBe(0);
  });
});
