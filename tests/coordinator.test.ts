import { describe, expect, it } from 'vitest';
import { EnemyCoordinator, type CoordinatorEnemy } from '../src/game/ai/EnemyCoordinator';

const player = { x: 1000, centerY: 550, alive: true };
const enemy = (id: string, x: number, archetype: CoordinatorEnemy['config']['archetype'] = 'basic'): CoordinatorEnemy => ({
  id, x, centerY: 550, alive: true, alerted: false, attackStage: 'none',
  config: { archetype, detectionRange: 420, leashRange: 600, attackRange: 85 },
});

describe('readable enemy coordination', () => {
  it('grants only the nearest two melee enemies approach and attack permission', () => {
    const coordinator = new EnemyCoordinator();
    const enemies = [enemy('far', 1300), enemy('near', 1080), enemy('middle', 1150)];
    coordinator.update(100, player, enemies);
    expect(coordinator.forEnemy(enemies[0])).toMatchObject({ canAttack: false, alert: true });
    expect(coordinator.forEnemy(enemies[1]).canAttack).toBe(true);
    expect(coordinator.forEnemy(enemies[2]).canAttack).toBe(true);
    expect(coordinator.forEnemy(enemies[0]).holdDistance).toBeGreaterThan(85);
  });

  it('keeps an ongoing telegraph committed even when another enemy gets closer', () => {
    const coordinator = new EnemyCoordinator();
    const committed = { ...enemy('windup', 1300), attackStage: 'windup' as const };
    const other = enemy('near', 1030);
    const reserve = enemy('reserve', 1080);
    coordinator.update(100, player, [committed, other, reserve]);
    expect(coordinator.forEnemy(committed).canAttack).toBe(true);
    expect(coordinator.forEnemy(other).canAttack).toBe(true);
    expect(coordinator.forEnemy(reserve).canAttack).toBe(false);
  });

  it('retains a melee slot throughout recovery instead of creating an unreadable pile-on', () => {
    const coordinator = new EnemyCoordinator();
    const recovering = { ...enemy('recovery', 1200), attackStage: 'recovery' as const };
    const near = enemy('near', 1030);
    const waiting = enemy('waiting', 1100);
    coordinator.update(100, player, [recovering, near, waiting]);
    expect(coordinator.forEnemy(recovering).canAttack).toBe(true);
    expect(coordinator.forEnemy(waiting).canAttack).toBe(false);
  });

  it('keeps the slot of a committed attack even when the player moves outside its detection range', () => {
    const coordinator = new EnemyCoordinator();
    const committed = { ...enemy('committed', 1700), attackStage: 'active' as const };
    const near = enemy('near', 1040);
    const waiting = enemy('waiting', 1090);
    coordinator.update(100, player, [committed, near, waiting]);
    expect(coordinator.forEnemy(near).canAttack).toBe(true);
    expect(coordinator.forEnemy(waiting).canAttack).toBe(false);
  });

  it('ranged enemies do not consume melee slots', () => {
    const coordinator = new EnemyCoordinator();
    const enemies = [enemy('bolt', 1100, 'ranged'), enemy('one', 1150), enemy('two', 1200)];
    coordinator.update(100, player, enemies);
    expect(enemies.map(e => coordinator.forEnemy(e).canAttack)).toEqual([true, true, true]);
  });

  it('alerts a nearby ally outside its own initial detection radius', () => {
    const coordinator = new EnemyCoordinator();
    const seeing = enemy('seeing', 1380);
    const ally = enemy('ally', 1570);
    const remote = enemy('remote', 1900);
    coordinator.update(100, player, [seeing, ally, remote]);
    expect(coordinator.forEnemy(ally).alert).toBe(true);
    expect(coordinator.forEnemy(remote).alert).toBe(false);
  });

  it('releases dead enemies and stops all attack permission after player death', () => {
    const coordinator = new EnemyCoordinator();
    const dead = { ...enemy('dead', 1010), alive: false, attackStage: 'active' as const };
    const enemies = [dead, enemy('one', 1100), enemy('two', 1150)];
    coordinator.update(100, player, enemies);
    expect(coordinator.forEnemy(dead).canAttack).toBe(false);
    expect(coordinator.forEnemy(enemies[2]).canAttack).toBe(true);
    coordinator.update(200, { ...player, alive: false }, enemies);
    expect(enemies.map(e => coordinator.forEnemy(e).canAttack)).toEqual([false, false, false]);
  });

  it('does not alert enemies on a different vertical route', () => {
    const coordinator = new EnemyCoordinator();
    const upper = { ...enemy('upper', 1050), centerY: 250 };
    coordinator.update(100, player, [upper]);
    expect(coordinator.forEnemy(upper)).toMatchObject({ canAttack: false, alert: false });
  });
});
