/** The mountain ape owns its move table; shared combat only resolves hit windows. */
export type ApePhase = 1 | 2;
export type ApeSkillId = 'claw' | 'leap' | 'rock' | 'roar';

export interface ApeSkill {
  id: ApeSkillId;
  label: string;
  windup: number;
  travel: number;
  active: number;
  recovery: number;
  cooldown: number;
  damage: number;
  range: number;
  height: number;
  knockback: number;
  speed?: number;
  lifetime?: number;
}

export const APE_RULES = {
  phase2Ratio: 0.5,
  transition: 900,
  openingGrace: 680,
  postStaggerGrace: 330,
  phase2SpeedMultiplier: 1.15,
  phase2CooldownMultiplier: 0.86,
  selectionDistance: 560,
  groundY: 596,
  leapJumpSpeed: 520,
  leapApproachSpeed: 470,
  roarWaveSpeed: 390,
  roarWaveLifetime: 1500,
} as const;

export const APE_SKILLS: Record<ApeSkillId, ApeSkill> = {
  claw: {
    id: 'claw', label: '利爪横扫', windup: 420, travel: 0, active: 150,
    recovery: 610, cooldown: 350, damage: 22, range: 128, height: 74, knockback: 195,
  },
  leap: {
    id: 'leap', label: '跃起震砸', windup: 620, travel: 800, active: 170,
    recovery: 920, cooldown: 600, damage: 32, range: 176, height: 90, knockback: 300,
  },
  rock: {
    id: 'rock', label: '投掷山岩', windup: 610, travel: 0, active: 110,
    recovery: 650, cooldown: 500, damage: 23, range: 480, height: 40, knockback: 175,
    speed: 450, lifetime: 1550,
  },
  roar: {
    id: 'roar', label: '狂啸震地', windup: 790, travel: 0, active: 180,
    recovery: 950, cooldown: 850, damage: 26, range: 245, height: 36, knockback: 240,
  },
};

export function apePhaseForHealth(hp: number, maxHp: number): ApePhase {
  return maxHp > 0 && hp / maxHp <= APE_RULES.phase2Ratio ? 2 : 1;
}

/** Ranges guide the ape toward a useful move while avoiding a third identical tell. */
export function chooseApeSkill(
  phase: ApePhase,
  distance: number,
  history: readonly string[],
  random: () => number = Math.random,
): ApeSkillId | null {
  if (distance > APE_RULES.selectionDistance) return null;
  const choices: { id: ApeSkillId; weight: number }[] = [];
  if (distance <= 175) choices.push({ id: 'claw', weight: 7 });
  if (distance >= 85 && distance <= 360) choices.push({ id: 'leap', weight: phase === 2 ? 7 : 5 });
  if (distance >= 235) choices.push({ id: 'rock', weight: distance > 350 ? 8 : 2 });
  if (phase === 2) choices.push({ id: 'roar', weight: distance > 175 ? 3 : 2 });
  const previous = history[history.length - 1];
  const blocked = history.length >= 2 && previous === history[history.length - 2] ? previous : '';
  const fair = choices.filter(choice => choice.id !== blocked).map(choice => ({
    ...choice, weight: choice.weight * (choice.id === previous ? 0.45 : 1),
  }));
  if (!fair.length) return null;
  const total = fair.reduce((sum, choice) => sum + choice.weight, 0);
  let roll = Math.max(0, Math.min(0.999999, random())) * total;
  for (const choice of fair) {
    roll -= choice.weight;
    if (roll < 0) return choice.id;
  }
  return fair[fair.length - 1].id;
}
