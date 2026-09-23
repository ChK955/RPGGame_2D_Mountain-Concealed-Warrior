import type { EnemyArchetype, EnemyConfig, PlayerStats, SkillConfig } from '../data/types';

export const PLAYER_DEFAULTS: PlayerStats = {
  maxHp: 120, hp: 120, attackDamage: 24, moveSpeed: 300, jumpForce: 650,
  level: 1, experience: 0, gold: 0, potionCount: 3,
};

const BOSS: EnemyConfig = {
  id: 'boss', archetype: 'boss', name: '镇关鬼将 · 玄骸', assetKey: 'enemy-elite',
  maxHp: 1000, damage: 23, speed: 135, detectionRange: 950, leashRange: 1100,
  attackRange: 130, windup: 420, active: 150, recovery: 500, cooldown: 1450,
  experience: 350, goldMin: 90, goldMax: 130, goldChance: 1, potionChance: 1,
  scale: 1.55, elite: true, tint: 0xe2b784, knockback: 240, attackHeight: 96,
  poise: { maxPoise: 300, poiseRecoveryDelay: 2200, poiseRecoveryRate: 50, staggerDuration: 800 },
};

export const ENEMIES: Record<EnemyArchetype | 'elite', EnemyConfig> = {
  basic: {
    id: 'basic', archetype: 'basic', name: '灰烬守卫', assetKey: 'enemy-basic',
    maxHp: 120, damage: 18, speed: 145,
    detectionRange: 420, leashRange: 600, attackRange: 85,
    windup: 420, active: 140, recovery: 470, cooldown: 1080,
    experience: 45, goldMin: 8, goldMax: 16, goldChance: 0.9, potionChance: 0.22,
    scale: 1, elite: false, tint: 0xffead4, knockback: 180, attackHeight: 72,
    poise: { maxPoise: 60, poiseRecoveryDelay: 1400, poiseRecoveryRate: 22, staggerDuration: 600 },
  },
  fast: {
    id: 'fast', archetype: 'fast', name: '追魂客', assetKey: 'enemy-basic',
    maxHp: 88, damage: 16, speed: 205,
    detectionRange: 500, leashRange: 650, attackRange: 200,
    windup: 350, active: 250, recovery: 480, cooldown: 1300,
    lungeSpeed: 800, lungeDuration: 250,
    experience: 50, goldMin: 10, goldMax: 20, goldChance: 0.9, potionChance: 0.24,
    scale: 0.94, elite: false, tint: 0x9ee4c8, knockback: 155, attackHeight: 64,
    poise: { maxPoise: 45, poiseRecoveryDelay: 1200, poiseRecoveryRate: 20, staggerDuration: 550 },
  },
  heavy: {
    id: 'heavy', archetype: 'heavy', name: '玄甲守卫', assetKey: 'enemy-basic',
    maxHp: 190, damage: 25, speed: 90,
    detectionRange: 410, leashRange: 580, attackRange: 120,
    windup: 700, active: 180, recovery: 750, cooldown: 1900,
    experience: 70, goldMin: 18, goldMax: 28, goldChance: 1, potionChance: 0.35,
    scale: 1.08, elite: false, tint: 0x93aec8, knockback: 330, attackHeight: 84,
    poise: { maxPoise: 150, poiseRecoveryDelay: 1800, poiseRecoveryRate: 35, staggerDuration: 700 },
  },
  ranged: {
    id: 'ranged', archetype: 'ranged', name: '烬弩手', assetKey: 'enemy-basic',
    maxHp: 78, damage: 15, speed: 120,
    detectionRange: 550, leashRange: 680, attackRange: 500,
    windup: 430, active: 120, recovery: 450, cooldown: 1900,
    preferredRange: 350, projectileSpeed: 400, projectileLifetime: 1800,
    experience: 45, goldMin: 10, goldMax: 20, goldChance: 0.95, potionChance: 0.28,
    scale: 0.96, elite: false, tint: 0xdab0db, knockback: 105, attackHeight: 18,
    poise: { maxPoise: 45, poiseRecoveryDelay: 1500, poiseRecoveryRate: 20, staggerDuration: 650 },
  },
  boss: BOSS,
  elite: BOSS,
};

export const SKILLS: { swordWave: SkillConfig } = {
  swordWave: {
    id: 'sword-wave', name: '流风剑气', cooldown: 4000,
    windup: 170, recovery: 260, damageMultiplier: 2.2,
    speed: 620, lifetime: 950, width: 54, height: 64, poiseDamage: 42,
  },
};

// Durations are milliseconds; distances and speeds use world pixels.
export const PLAYER_ATTACK = {
  windup: 110, active: 110, recovery: 160, cooldown: 400,
  range: 90, height: 68, offsetY: 0, knockback: 190, poiseDamage: 22,
};

export const ENEMY_BEHAVIOR = {
  maxMeleeAttackers: 2, alertRadius: 270, holdDistance: 180, sameLevelTolerance: 115,
  patrolSpeedMultiplier: 0.38, patrolPause: 400, hitFlash: 90, staggerFlash: 130,
  hitKnockbackMultiplier: 0.12, hitKnockbackMax: 28, staggerKnockbackMultiplier: 0.8,
  retreatRangeRatio: 0.72, rangeTolerance: 40, projectileWidth: 26, fastStrikeRange: 65,
};

export const DASH = { duration: 180, cooldown: 1200, speed: 760, invulnerability: 160 };
export const PHYSICS = {
  gravity: 1300, acceleration: 2200, drag: 2600,
  maxFallSpeed: 950, coyoteMs: 100, jumpBufferMs: 120,
};
export const POTION_HEAL = 55;
export const LEVEL_GROWTH = { maxHp: 18, attackDamage: 5, heal: 36 };

export function experienceForLevel(level: number): number {
  return 100 + Math.max(0, Math.floor(level) - 1) * 60;
}
