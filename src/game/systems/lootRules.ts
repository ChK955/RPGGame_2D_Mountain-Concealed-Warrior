import type { EnemyConfig } from '../data/types';

export interface LootDrop { kind: 'gold' | 'potion'; amount: number }

export function rollLoot(config: EnemyConfig, rng: () => number = Math.random): LootDrop[] {
  const drops: LootDrop[] = [];
  if (rng() < config.goldChance) {
    const amount = config.goldMin + Math.floor(rng() * (config.goldMax - config.goldMin + 1));
    drops.push({ kind: 'gold', amount });
  }
  if (rng() < config.potionChance) drops.push({ kind: 'potion', amount: 1 });
  return drops;
}
