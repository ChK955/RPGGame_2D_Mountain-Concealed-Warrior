import { describe, expect, it } from 'vitest';
import { LEVEL2_MAP } from '../src/game/world/level2';
import { LEVEL2_HAZARDS } from '../src/game/systems/FallingRockHazard';

describe('mist road level data', () => {
  it('provides a second chapter with four regions, a checkpoint and an isolated boss arena', () => {
    expect(LEVEL2_MAP.id).toBe('level2-mist-road');
    expect(LEVEL2_MAP.width).toBeGreaterThanOrEqual(5000);
    expect(LEVEL2_MAP.width).toBeLessThanOrEqual(6500);
    expect(LEVEL2_MAP.zones).toHaveLength(4);
    expect(LEVEL2_MAP.spawn.x).toBeLessThan(LEVEL2_MAP.checkpoint.x);
    expect(LEVEL2_MAP.checkpoint.x).toBeLessThan(LEVEL2_MAP.bossArena!.checkpoint.x);
    expect(LEVEL2_MAP.bossArena!.checkpoint.x).toBeLessThan(LEVEL2_MAP.bossArena!.triggerX);
    expect(LEVEL2_MAP.bossArena!.right).toBeLessThan(LEVEL2_MAP.exit.x);
    expect(LEVEL2_MAP.enemies.filter(enemy => enemy.type === 'ape-boss')).toHaveLength(1);
  });

  it('keeps every ground patrol on a safe uninterrupted platform', () => {
    for (const enemy of LEVEL2_MAP.enemies) {
      expect(enemy.patrolLeft).toBeLessThan(enemy.x);
      expect(enemy.patrolRight).toBeGreaterThan(enemy.x);
      const floor = LEVEL2_MAP.platforms.find(platform =>
        Math.abs(platform.y - (enemy.y + (enemy.type === 'ape-boss' ? 62 : 40))) < 32 &&
        platform.x <= enemy.patrolLeft && platform.x + platform.width >= enemy.patrolRight,
      );
      expect(floor, `${enemy.id} patrol should have floor from ${enemy.patrolLeft} to ${enemy.patrolRight}`).toBeDefined();
    }
  });

  it('places warned rock falls on reachable ground away from the boss checkpoint', () => {
    expect(LEVEL2_HAZARDS.length).toBeGreaterThanOrEqual(2);
    for (const rock of LEVEL2_HAZARDS) {
      expect(rock.warningMs).toBeGreaterThanOrEqual(500);
      expect(rock.warningMs).toBeLessThanOrEqual(800);
      expect(rock.triggerLeft).toBeLessThan(rock.x);
      expect(rock.triggerRight).toBeGreaterThan(rock.x);
      expect(rock.x).toBeLessThan(LEVEL2_MAP.bossArena!.checkpoint.x - 150);
      expect(LEVEL2_MAP.platforms.some(p => p.style === 'ground' && p.x <= rock.x && p.x + p.width >= rock.x && p.y === rock.impactY)).toBe(true);
    }
  });

  it('keeps raised bridge undersides beyond each ground launch edge', () => {
    const gaps = [1180, 2100, 3050];
    const bridges = LEVEL2_MAP.platforms.filter(platform => platform.style === 'bridge');
    expect(bridges).toHaveLength(gaps.length);
    bridges.forEach((bridge, index) => {
      expect(bridge.x).toBeGreaterThan(gaps[index]);
      expect(bridge.x).toBeLessThan(gaps[index] + 20);
      expect(bridge.width).toBeGreaterThan(190);
    });
  });
});
