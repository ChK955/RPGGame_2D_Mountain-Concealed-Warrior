import { BOSS_RULES, type BossPhase, type BossSkillId } from '../config/boss';

export function bossPhaseForHealth(hp: number, maxHp: number): BossPhase {
  const ratio = maxHp > 0 ? hp / maxHp : 0;
  return ratio <= BOSS_RULES.phase3Ratio ? 3 : ratio <= BOSS_RULES.phase2Ratio ? 2 : 1;
}

/** Distance gates prevent blind slashes; recent history softens repeats and forbids triples. */
export function chooseBossSkill(phase: BossPhase, distance: number, history: readonly string[], random: () => number = Math.random): BossSkillId | null {
  if (distance > BOSS_RULES.selectionDistance) return null;
  const candidates: { id: BossSkillId; weight: number }[] = [];
  if (distance <= 175) candidates.push({ id: 'slash', weight: phase === 3 ? 3 : 7 });
  candidates.push({ id: 'lunge', weight: distance > 175 ? 8 : 2 });
  if (phase >= 2) {
    candidates.push({ id: 'shockwave', weight: distance > 200 ? 4 : 2 });
    if (distance <= 190) candidates.push({ id: 'combo', weight: phase === 3 ? 8 : 5 });
  }
  if (phase === 3 && distance >= 75) candidates.push({ id: 'phantom', weight: distance > 160 ? 6 : 4 });
  const last = history[history.length - 1];
  const forbidden = history.length >= 2 && last === history[history.length - 2] ? last : null;
  const fair = candidates.filter(candidate => candidate.id !== forbidden).map(candidate => ({
    ...candidate, weight: candidate.weight * (candidate.id === last ? 0.45 : 1),
  }));
  if (!fair.length) return null;
  const total = fair.reduce((sum, candidate) => sum + candidate.weight, 0);
  let choice = Math.min(0.999999, Math.max(0, random())) * total;
  for (const candidate of fair) {
    choice -= candidate.weight;
    if (choice < 0) return candidate.id;
  }
  return fair[fair.length - 1].id;
}
