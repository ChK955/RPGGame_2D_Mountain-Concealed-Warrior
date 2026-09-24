import type { MapDefinition } from '../data/types';
import { DEMO_MAP } from './map';
import { LEVEL2_MAP } from './level2';
import { LEVEL2_HAZARDS, type FallingRockDefinition } from '../systems/FallingRockHazard';

export type LevelId = 'level1' | 'level2';
export interface LevelDefinition {
  id: LevelId;
  title: string;
  map: MapDefinition;
  bossName: string;
  hazards: readonly FallingRockDefinition[];
  returnDelay: number;
}

export const LEVELS: Record<LevelId, LevelDefinition> = {
  level1: { id:'level1', title:'沉月山林', map:DEMO_MAP, bossName:'镇关鬼将 · 玄骸', hazards:[], returnDelay:3500 },
  level2: { id:'level2', title:'雾隐古道', map:LEVEL2_MAP, bossName:'赤目山魈 · 魇猿', hazards:LEVEL2_HAZARDS, returnDelay:3500 },
};
export function getLevel(id: string | undefined): LevelDefinition { return LEVELS[id === 'level2' ? 'level2' : 'level1']; }
