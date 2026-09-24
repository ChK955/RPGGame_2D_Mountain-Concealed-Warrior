/** Persistent flags are plain data so a future save system can JSON-encode them. */
export interface WorldProgress {
  tutorialComplete: boolean;
  level1Unlocked: boolean;
  level1Cleared: boolean;
  level2Unlocked: boolean;
  level2Cleared: boolean;
  level1FirstClearRewardClaimed: boolean;
  level2FirstClearRewardClaimed: boolean;
  merchantUnlocks: string[];
  purchasedItems: string[];
  currentReturnPoint: 'intro' | 'level1' | 'level2';
}

export type LevelId = 'level1' | 'level2';
export type GateId = LevelId | 'level3';
export type VillagePhase = 'intro' | 'level1Cleared' | 'level2Cleared';

export const TUTORIAL_REWARD = { gold: 30, potions: 1 } as const;
export const FIRST_CLEAR_REWARDS: Record<LevelId, { gold: number; potions: number; experience: number }> = {
  level1: { gold: 120, potions: 1, experience: 80 },
  level2: { gold: 180, potions: 1, experience: 120 },
};
export const MAX_POTIONS = 5;

export function createInitialWorld(): WorldProgress {
  return {
    tutorialComplete: false,
    level1Unlocked: false,
    level1Cleared: false,
    level2Unlocked: false,
    level2Cleared: false,
    level1FirstClearRewardClaimed: false,
    level2FirstClearRewardClaimed: false,
    merchantUnlocks: [],
    purchasedItems: [],
    currentReturnPoint: 'intro',
  };
}

export function canEnterLevel(world: WorldProgress, id: GateId): boolean {
  if (id === 'level1') return world.level1Unlocked;
  if (id === 'level2') return world.level2Unlocked;
  return false;
}

export function villagePhase(world: WorldProgress): VillagePhase {
  if (world.level2Cleared) return 'level2Cleared';
  if (world.level1Cleared) return 'level1Cleared';
  return 'intro';
}

export function gateMessage(world: WorldProgress, id: GateId): string {
  if (id === 'level3') return '前路尚未开放';
  if (id === 'level1') return canEnterLevel(world, id) ? '进入沉月山林' : '完成新手训练后开启';
  return canEnterLevel(world, id) ? '进入雾隐古道' : '击败镇关鬼将后开启';
}
