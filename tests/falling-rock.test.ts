import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import type { Player } from '../src/game/entities/Player';
import { FallingRockHazard, type FallingRockDefinition } from '../src/game/systems/FallingRockHazard';

const definition: FallingRockDefinition = {
  id: 'test-rock', x: 500, triggerLeft: 430, triggerRight: 570, impactY: 596,
  damage: 19, warningMs: 650, activeMs: 180, cooldownMs: 2400, width: 92, height: 90,
};

function fixture() {
  const graphics = { setDepth: vi.fn().mockReturnThis(), clear: vi.fn(), fillStyle: vi.fn(), fillEllipse: vi.fn(), fillCircle: vi.fn(), fillRect: vi.fn(), lineStyle: vi.fn(), strokeEllipse: vi.fn(), destroy: vi.fn() };
  const scene = { add: { graphics: vi.fn(() => graphics) }, cameras: { main: { shake: vi.fn() } } };
  const player = { alive: true, x: 500, bounds: { x: 480, y: 520, width: 40, height: 76 }, receiveDamage: vi.fn(() => 19) };
  const hazard = new FallingRockHazard(scene as unknown as Phaser.Scene, [definition]);
  return { graphics, scene, player, hazard, tick: (now: number) => hazard.update(now, player as unknown as Player) };
}

describe('falling rock timing and hitboxes', () => {
  it('shows a full warning and then hits once inside the independent impact rectangle', () => {
    const f = fixture();
    f.tick(1000);
    expect(f.hazard.snapshot()[0].state).toBe('warning');
    expect(f.hazard.hitboxes).toHaveLength(0);
    f.tick(1649);
    expect(f.player.receiveDamage).not.toHaveBeenCalled();
    f.tick(1650);
    expect(f.hazard.hitboxes).toHaveLength(1);
    expect(f.player.receiveDamage).toHaveBeenCalledTimes(1);
    f.tick(1700);
    expect(f.player.receiveDamage).toHaveBeenCalledTimes(1);
    f.tick(1830);
    expect(f.hazard.hitboxes).toHaveLength(0);
  });

  it('lets a moving or jumping player avoid the impact, and pause holds the warning clock', () => {
    const f = fixture(); f.tick(1000);
    for (let frame = 0; frame < 30; frame++) f.tick(1300);
    expect(f.hazard.snapshot()[0].state).toBe('warning');
    f.player.bounds.y = 400;
    f.tick(1650);
    expect(f.player.receiveDamage).not.toHaveBeenCalled();
    f.tick(1830);
    expect(f.player.receiveDamage).not.toHaveBeenCalled();
  });

  it('resets an interrupted fall and its cooldown without leaving a hitbox', () => {
    const f = fixture(); f.tick(1000); f.tick(1650);
    f.hazard.reset(2000);
    expect(f.hazard.hitboxes).toHaveLength(0);
    expect(f.hazard.snapshot()[0].state).toBe('idle');
    f.tick(2000);
    expect(f.hazard.snapshot()[0].state).toBe('warning');
    f.hazard.destroy();
    expect(f.graphics.destroy).toHaveBeenCalledTimes(1);
  });
});
