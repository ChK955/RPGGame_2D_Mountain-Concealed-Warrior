import { experienceForLevel, LEVEL_GROWTH, PLAYER_DEFAULTS, POTION_HEAL } from '../config/balance';
import type { EnemyConfig, PlayerStats, Point } from './types';
import { createInitialWorld, FIRST_CLEAR_REWARDS, MAX_POTIONS, TUTORIAL_REWARD, type LevelId, type WorldProgress } from '../systems/WorldRules';

export interface SerializedGameState {
  stats: PlayerStats;
  world: WorldProgress;
  checkpoint: Point;
  checkpointActive: boolean;
  checkpointId: string;
  visitedCheckpoints: string[];
  kills: number;
  totalEnemies: number;
  elapsed: number;
  completed: boolean;
}

export class GameState {
  public stats: PlayerStats = { ...PLAYER_DEFAULTS };
  public world: WorldProgress = createInitialWorld();
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
    this.stats.potionCount = Math.min(MAX_POTIONS, Math.max(3, this.stats.potionCount));
    return true;
  }

  respawn(): void {
    this.stats.hp = this.stats.maxHp;
    if (this.checkpointId === 'boss') this.stats.potionCount = Math.min(MAX_POTIONS, Math.max(3, this.stats.potionCount));
  }

  reset(spawn: Point): void {
    this.stats = { ...PLAYER_DEFAULTS };
    this.world = createInitialWorld();
    this.checkpoint = { ...spawn };
    this.checkpointActive = false;
    this.checkpointId = 'spawn';
    this.visitedCheckpoints.clear();
    this.kills = 0;
    this.elapsed = 0;
    this.completed = false;
  }

  addLoot(kind: 'gold' | 'potion', amount: number): void {
    const count = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
    if (kind === 'gold') this.stats.gold += count;
    else this.stats.potionCount = Math.min(MAX_POTIONS, this.stats.potionCount + count);
  }

  /** One-time village training reward and first road unlock. */
  completeTutorial(): boolean {
    if (this.world.tutorialComplete) return false;
    this.world.tutorialComplete = true;
    this.world.level1Unlocked = true;
    this.stats.gold += TUTORIAL_REWARD.gold;
    this.stats.potionCount = Math.min(MAX_POTIONS, this.stats.potionCount + TUTORIAL_REWARD.potions);
    return true;
  }

  /** Boss kill XP and drops are awarded separately by GameSession. */
  clearLevel(id: LevelId): boolean {
    if (id === 'level1' && !this.world.level1Unlocked) return false;
    if (id === 'level2' && !this.world.level2Unlocked) return false;
    const clearedKey = id === 'level1' ? 'level1Cleared' : 'level2Cleared';
    // A replay can return to a different village entrance without earning its reward again.
    this.world.currentReturnPoint = id;
    if (this.world[clearedKey]) return false;
    this.world[clearedKey] = true;
    if (id === 'level1') {
      this.world.level2Unlocked = true;
      this.world.merchantUnlocks.push('charm', 'sharpening');
    }
    const rewardKey = id === 'level1' ? 'level1FirstClearRewardClaimed' : 'level2FirstClearRewardClaimed';
    if (!this.world[rewardKey]) {
      this.world[rewardKey] = true;
      const reward = FIRST_CLEAR_REWARDS[id];
      this.stats.gold += reward.gold;
      this.stats.potionCount = Math.min(MAX_POTIONS, this.stats.potionCount + reward.potions);
      this.gainExperience(reward.experience);
    }
    return true;
  }

  /** Prepare one combat map; stats, purchases and world flags survive scene changes. */
  enterLevel(spawn: Point): void {
    this.checkpoint = { ...spawn };
    this.checkpointId = 'spawn';
    this.checkpointActive = false;
    this.visitedCheckpoints.clear();
    this.kills = 0;
    this.totalEnemies = 0;
    this.elapsed = 0;
    this.completed = false;
  }

  serialize(): SerializedGameState {
    return {
      stats: { ...this.stats },
      world: {
        ...this.world,
        merchantUnlocks: [...this.world.merchantUnlocks],
        purchasedItems: [...this.world.purchasedItems],
      },
      checkpoint: { ...this.checkpoint },
      checkpointActive: this.checkpointActive,
      checkpointId: this.checkpointId,
      visitedCheckpoints: [...this.visitedCheckpoints],
      kills: this.kills,
      totalEnemies: this.totalEnemies,
      elapsed: this.elapsed,
      completed: this.completed,
    };
  }
}
