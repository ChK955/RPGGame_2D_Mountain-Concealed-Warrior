export type BossPhase = 1 | 2 | 3;
export type BossSkillId = 'slash' | 'lunge' | 'shockwave' | 'combo' | 'phantom';
export interface BossStrike {
  windup: number; active: number; recovery: number;
  range: number; height: number; damage: number; knockback: number;
  speed?: number;
}
export interface BossSkill {
  id: BossSkillId; label: string; steps: readonly BossStrike[]; cooldown: number;
}

export const BOSS_RULES = {
  phase2Ratio: 0.65, phase3Ratio: 0.3, transition: 850, openingGrace: 650,
  phase3SpeedMultiplier: 1.14, phase3CooldownMultiplier: 0.82,
  phase3RecoveryMultiplier: 0.9, phase3LungeMultiplier: 1.15,
  postStaggerGrace: 320, approachDistance: 125, selectionDistance: 510,
  shockwaveSpeed: 360, shockwaveLifetime: 1800, shockwaveWidth: 44, shockwaveHeight: 34,
} as const;

export const BOSS_SKILLS: Record<BossSkillId, BossSkill> = {
  slash: {
    id: 'slash', label: '横斩', cooldown: 290,
    steps: [{ windup: 420, active: 150, recovery: 520, range: 136, height: 66, damage: 22, knockback: 190 }],
  },
  lunge: {
    id: 'lunge', label: '突进斩', cooldown: 380,
    steps: [{ windup: 560, active: 260, recovery: 750, range: 112, height: 66, damage: 27, knockback: 230, speed: 610 }],
  },
  shockwave: {
    id: 'shockwave', label: '震地斩 · 跃起', cooldown: 480,
    steps: [{ windup: 720, active: 180, recovery: 820, range: 205, height: 34, damage: 29, knockback: 240 }],
  },
  combo: {
    id: 'combo', label: '二连斩', cooldown: 370,
    steps: [
      { windup: 420, active: 140, recovery: 0, range: 126, height: 66, damage: 21, knockback: 150 },
      { windup: 300, active: 150, recovery: 740, range: 164, height: 72, damage: 26, knockback: 215 },
    ],
  },
  phantom: {
    id: 'phantom', label: '鬼影连斩', cooldown: 500,
    steps: [
      { windup: 680, active: 180, recovery: 0, range: 115, height: 62, damage: 24, knockback: 145, speed: 530 },
      { windup: 260, active: 180, recovery: 0, range: 120, height: 62, damage: 24, knockback: 145, speed: 560 },
      { windup: 260, active: 180, recovery: 1150, range: 158, height: 70, damage: 31, knockback: 245, speed: 590 },
    ],
  },
};

export function bossSkillForPhase(id: BossSkillId, phase: BossPhase): BossSkill {
  const skill = BOSS_SKILLS[id];
  if (phase !== 3) return skill;
  return {
    ...skill,
    cooldown: skill.cooldown * BOSS_RULES.phase3CooldownMultiplier,
    steps: skill.steps.map(step => ({
      ...step,
      recovery: id === 'phantom' ? step.recovery : step.recovery * BOSS_RULES.phase3RecoveryMultiplier,
      speed: step.speed ? step.speed * BOSS_RULES.phase3LungeMultiplier : undefined,
    })),
  };
}
