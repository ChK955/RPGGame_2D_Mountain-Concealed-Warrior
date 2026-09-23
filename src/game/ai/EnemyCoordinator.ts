import type { EnemyConfig } from '../data/types';
import { ENEMY_BEHAVIOR } from '../config/balance';

export interface EnemyTactics { canAttack: boolean; alert: boolean; holdDistance: number }
export interface CoordinatorEnemy {
  id: string; x: number; centerY: number; alive: boolean; alerted: boolean;
  attackStage: 'none' | 'windup' | 'active' | 'recovery';
  config: Pick<EnemyConfig, 'archetype' | 'detectionRange' | 'leashRange' | 'attackRange'>;
}
export interface CoordinatorPlayer { x: number; centerY: number; alive: boolean }
export class EnemyCoordinator {
  private readonly tactics = new Map<string, EnemyTactics>();

  update(_now: number, player: CoordinatorPlayer, enemies: CoordinatorEnemy[]): void {
    this.tactics.clear();
    if (!player.alive) return;
    const sameLevel = (enemy: CoordinatorEnemy) => Math.abs(enemy.centerY - player.centerY) < ENEMY_BEHAVIOR.sameLevelTolerance;
    const normal = enemies.filter(enemy => enemy.alive && enemy.config.archetype !== 'boss');
    const seeing = normal.filter(enemy => sameLevel(enemy) && Math.abs(enemy.x - player.x) <
      (enemy.alerted ? enemy.config.leashRange : enemy.config.detectionRange));
    const alerted = normal.filter(enemy => sameLevel(enemy) && (seeing.includes(enemy) || seeing.some(ally =>
      Math.abs(ally.x - enemy.x) < ENEMY_BEHAVIOR.alertRadius && Math.abs(ally.centerY - enemy.centerY) < ENEMY_BEHAVIOR.sameLevelTolerance)));
    // A locked attack keeps its slot even if the player jumps or retreats outside detection.
    const melee = normal.filter(enemy => enemy.config.archetype !== 'ranged' &&
      (enemy.attackStage !== 'none' || alerted.includes(enemy)));
    melee.sort((a, b) => Number(b.attackStage !== 'none') - Number(a.attackStage !== 'none') ||
      Math.abs(a.x - player.x) - Math.abs(b.x - player.x) || a.id.localeCompare(b.id));
    const selected = new Set(melee.slice(0, ENEMY_BEHAVIOR.maxMeleeAttackers).map(enemy => enemy.id));
    for (const enemy of normal) {
      const alert = alerted.includes(enemy);
      const canAttack = alert && (enemy.config.archetype === 'ranged' || selected.has(enemy.id));
      this.tactics.set(enemy.id, {
        alert, canAttack,
        holdDistance: canAttack ? enemy.config.attackRange * 0.8 : Math.max(ENEMY_BEHAVIOR.holdDistance, enemy.config.attackRange + 70),
      });
    }
  }

  forEnemy(enemy: CoordinatorEnemy): EnemyTactics {
    return this.tactics.get(enemy.id) ?? { canAttack: false, alert: false, holdDistance: ENEMY_BEHAVIOR.holdDistance };
  }
}
