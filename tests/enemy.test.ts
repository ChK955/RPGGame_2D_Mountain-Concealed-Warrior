import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/game/entities/Actor', () => {
  class Actor {
    state = 'Idle'; facing = 1; lockedUntil = 0; hurtUntil = 0; invulnerableUntil = 0;
    body: any; sprite: any;
    constructor(public scene: unknown, public id: string, public x: number, public y: number) {
      const body: any = { velocity: { x: 0, y: 0 }, blocked: {}, touching: {}, enable: true };
      for (const method of ['setDragX', 'setMaxVelocity', 'setAccelerationX', 'setAllowGravity']) body[method] = () => body;
      body.setVelocityX = (v: number) => { body.velocity.x = v; return body; };
      body.setVelocityY = (v: number) => { body.velocity.y = v; return body; };
      body.setVelocity = (x: number, y: number) => { body.velocity = { x, y }; return body; };
      body.stop = () => body.setVelocity(0, 0);
      body.reset = (x: number, y: number) => { this.x = x; this.y = y; return body; };
      this.body = body;
      const sprite: any = { scaleX: 1, scaleY: 1, alpha: 1 };
      for (const method of ['setScale', 'setTint', 'setTintFill', 'clearTint', 'setVisible', 'setActive']) sprite[method] = () => sprite;
      sprite.setAlpha = (v: number) => { sprite.alpha = v; return sprite; };
      this.sprite = sprite;
    }
    get alive() { return (this as any).hp > 0 && this.state !== 'Death'; }
    get centerY() { return this.y; }
    face(direction: number) { if (direction) this.facing = direction > 0 ? 1 : -1; }
    animate() {}
    die() { this.state = 'Death'; this.body.stop(); this.body.enable = false; }
  }
  return { Actor };
});

import { Enemy } from '../src/game/entities/Enemy';
import { ENEMIES } from '../src/game/config/balance';
import type { Player } from '../src/game/entities/Player';
import type { CombatSystem } from '../src/game/combat/CombatSystem';
const player = { x: 1080, centerY: 550, alive: true } as Player;
const fixture = (type: keyof typeof ENEMIES = 'basic') => {
  const enemy = new Enemy({} as never, { id: 'test', type, x: 1000, y: 550, patrolLeft: 800, patrolRight: 1300 }, ENEMIES[type]);
  const combat = { melee: vi.fn(), launchProjectile: vi.fn(), cancel: vi.fn() } as unknown as CombatSystem;
  return { enemy, combat };
};

describe('enemy actions and damage interruptions', () => {
  it('ordinary damage preserves windup and its locked direction', () => {
    const { enemy, combat } = fixture();
    enemy.update(100, player, combat);
    expect(enemy.attackStage).toBe('windup');
    expect(enemy.receiveDamage(24, -1, 200, 190, 22)).toBe(24);
    expect(enemy.state).toBe('Telegraph');
    expect(enemy.attackStage).toBe('windup');
    enemy.update(520, { ...player, x: 900 } as Player, combat);
    expect(enemy.attackStage).toBe('active');
    expect(enemy.facing).toBe(1);
    expect(combat.melee).toHaveBeenCalledOnce();
  });

  it('only a real poise break cancels an action and repeated hits cannot extend stagger', () => {
    const { enemy, combat } = fixture();
    enemy.update(100, player, combat);
    enemy.receiveDamage(1, -1, 150, 190, 60);
    expect(enemy.state).toBe('Stagger');
    expect(enemy.attackStage).toBe('none');
    expect(enemy.staggeredAt).toBe(150);
    enemy.receiveDamage(1, 1, 300, 190, 100);
    enemy.update(751, player, combat);
    expect(enemy.state).not.toBe('Stagger');
    expect(enemy.poise.current).toBe(60);
  });

  it('heavy attacks remain active after an ordinary hit with poise remaining', () => {
    const { enemy, combat } = fixture('heavy');
    enemy.update(100, player, combat);
    enemy.receiveDamage(24, -1, 200, 190, 22);
    enemy.update(800, player, combat);
    expect(enemy.state).toBe('Attack');
    expect(enemy.poise.current).toBe(128);
    expect(enemy.hp).toBe(166);
  });

  it('fast enemy moves only during the active lunge and stops for recovery', () => {
    const { enemy, combat } = fixture('fast');
    const distant = { ...player, x: 1180 } as Player;
    enemy.update(100, distant, combat);
    expect(enemy.combatCue?.kind).toBe('lunge');
    expect(enemy.body.velocity.x).toBe(0);
    enemy.update(450, distant, combat);
    expect(enemy.attackStage).toBe('active');
    expect(enemy.body.velocity.x).toBeGreaterThan(600);
    enemy.update(700, distant, combat);
    expect(enemy.attackStage).toBe('recovery');
    expect(enemy.body.velocity.x).toBe(0);
  });

  it('ranged enemy starts a telegraphed bolt instead of melee and retreats when too close', () => {
    const { enemy, combat } = fixture('ranged');
    enemy.update(100, { ...player, x: 1330 } as Player, combat);
    expect(combat.launchProjectile).toHaveBeenCalledWith(enemy, expect.objectContaining({ kind: 'bolt', windup: 430, speed: 400 }));
    expect(combat.melee).not.toHaveBeenCalled();
    enemy.update(1200, player, combat);
    expect(enemy.body.velocity.x).toBeLessThan(0);
  });

  it('keeps closing the small gap just outside melee range', () => {
    const { enemy, combat } = fixture();
    enemy.update(100, { ...player, x: 1095 } as Player, combat);
    expect(enemy.state).toBe('Chase');
    expect(enemy.body.velocity.x).toBeGreaterThan(0);
  });

  it('a ranged enemy forced against its patrol edge still fires instead of retreating forever', () => {
    const { enemy, combat } = fixture('ranged');
    (enemy as any).x = 800;
    enemy.update(100, { ...player, x: 880 } as Player, combat);
    expect(enemy.attackStage).toBe('windup');
    expect(combat.launchProjectile).toHaveBeenCalledOnce();
  });

  it('respects coordinator waiting distance and never lunges past the patrol edge', () => {
    const { enemy, combat } = fixture('fast');
    enemy.update(100, player, combat, { canAttack: false, alert: true, holdDistance: 260 });
    expect(combat.melee).not.toHaveBeenCalled();
    expect(enemy.state).toBe('Alert');
    expect(enemy.body.velocity.x).toBeLessThan(0);
    (enemy as any).x = 1299;
    enemy.update(200, { ...player, x: 1450 } as Player, combat);
    enemy.update(550, { ...player, x: 1450 } as Player, combat);
    expect(enemy.body.velocity.x).toBeLessThanOrEqual(20);
  });

  it('clears an action when player dies and resets poise, cues and cooldowns', () => {
    const { enemy, combat } = fixture();
    enemy.update(100, player, combat);
    enemy.update(200, { ...player, alive: false } as Player, combat);
    expect(combat.cancel).toHaveBeenCalledWith(enemy);
    expect(enemy.attackStage).toBe('none');
    enemy.receiveDamage(20, -1, 300, 190, 22);
    enemy.resetPosition(true);
    expect(enemy.hp).toBe(enemy.maxHp);
    expect(enemy.poise.current).toBe(enemy.poise.max);
    expect(enemy.combatCue).toBeNull();
    expect(enemy.body.velocity.x).toBe(0);
  });
});
