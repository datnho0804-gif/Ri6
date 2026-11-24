import { describe, expect, it } from 'vitest';
import {
  createInitialLotA,
  createInitialSettings,
  createInitialTrees,
  generateDeviceId,
} from './seed';

describe('database initial seed builders (T01 AC6)', () => {
  it('generates valid UUID v4 deviceIds', () => {
    const id = generateDeviceId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('creates exactly 15 clean SR01-SR15 trees without fake history', () => {
    const trees = createInitialTrees('dev-1', '2026-11-24T00:00:00.000Z');
    expect(trees).toHaveLength(15);
    expect(trees[0].id).toBe('SR01');
    expect(trees[14].id).toBe('SR15');
    for (const tree of trees) {
      expect(tree.lot).toBe('B');
      expect(tree.location).toBe('');
      expect(tree.ageYears).toBeNull();
      expect(tree.stage).toBeNull();
      expect(tree.health).toBe('tot');
      expect(tree.needsPruning).toBe(false);
      expect(tree.diseaseWatch).toBe(false);
      expect(tree.updatedBy).toBe('dev-1');
    }
  });

  it('creates clean LOT_A with 50 trees and empty stage', () => {
    const lotA = createInitialLotA('dev-1', '2026-11-24T00:00:00.000Z');
    expect(lotA.id).toBe('LOT_A');
    expect(lotA.treeCount).toBe(50);
    expect(lotA.stage).toBeNull();
    expect(lotA.updatedBy).toBe('dev-1');
  });

  it('creates local-only settings pointing to private Ri6-data repo without secrets', () => {
    const settings = createInitialSettings('dev-1', '0.1.0');
    expect(settings.id).toBe('app');
    expect(settings.deviceId).toBe('dev-1');
    expect(settings.dataRepo).toBe('datnho0804-gif/Ri6-data');
    expect(settings.dataBranch).toBe('main');
    expect(settings.githubToken).toBeUndefined();
    expect(settings.geminiApiKey).toBeUndefined();
  });
});
