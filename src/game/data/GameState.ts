import { experienceForLevel, LEVEL_GROWTH, PLAYER_DEFAULTS, POTION_HEAL } from '../config/balance';
import type { EnemyConfig, PlayerStats, Point } from './types';

export class GameState {
  public stats: PlayerStats = { ...PLAYER_DEFAULTS };
  public checkpoint: Point;
  public checkpointActive = false;
  public checkpointId = 'spawn';
  public readonly visitedCheckpoints = new Set<string>();
  public kills = 0;
  public totalEnemies = 0;
  public elapsed = 0;
  public completed = false;

  constructor(spawn: Point) {
    this.checkpoint = { ...spawn };
  }

  takeDamage(amount: number): number {
    const damage = Math.min(this.stats.hp, Math.max(0, amount));
    this.stats.hp -= damage;
    return damage;
  }

  heal(amount: number): number {
    const restored = Math.min(this.stats.maxHp - this.stats.hp, Math.max(0, amount));
    this.stats.hp += restored;
    return restored;
  }

  usePotion(): boolean {
    if (this.stats.potionCount <= 0 || this.stats.hp <= 0 || this.stats.hp >= this.stats.maxHp) return false;
    this.stats.potionCount -= 1;
    this.heal(POTION_HEAL);
    return true;
  }

  gainExperience(amount: number): number {
    this.stats.experience += Math.max(0, amount);
    let levels = 0;
    while (this.stats.experience >= experienceForLevel(this.stats.level)) {
      this.stats.experience -= experienceForLevel(this.stats.level);
      this.stats.level += 1;
      this.stats.maxHp += LEVEL_GROWTH.maxHp;
      this.stats.attackDamage += LEVEL_GROWTH.attackDamage;
      this.heal(LEVEL_GROWTH.heal);
      levels += 1;
    }
    return levels;
  }

  grantKill(config: EnemyConfig): number {
    this.kills += 1;
    return this.gainExperience(config.experience);
  }

  activateCheckpoint(point: Point, id = 'mid'): boolean {
    this.checkpoint = { ...point };
    this.checkpointId = id;
    if (this.visitedCheckpoints.has(id)) return false;
    this.visitedCheckpoints.add(id);
    this.checkpointActive = true;
    this.heal(this.stats.maxHp);
    this.stats.potionCount = Math.max(3, this.stats.potionCount);
    return true;
  }

  respawn(): void {
    this.stats.hp = this.stats.maxHp;
    if (this.checkpointId === 'boss') this.stats.potionCount = Math.max(3, this.stats.potionCount);
  }

  reset(spawn: Point): void {
    this.stats = { ...PLAYER_DEFAULTS };
    this.checkpoint = { ...spawn };
    this.checkpointActive = false;
    this.checkpointId = 'spawn';
    this.visitedCheckpoints.clear();
    this.kills = 0;
    this.elapsed = 0;
    this.completed = false;
  }

  addLoot(kind: 'gold' | 'potion', amount: number): void {
    const count = Math.max(0, Math.floor(amount));
    if (kind === 'gold') this.stats.gold += count;
    else this.stats.potionCount += count;
  }
}
