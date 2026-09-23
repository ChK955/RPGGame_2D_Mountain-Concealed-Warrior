import type { BossSkill, BossStrike } from '../config/boss';
export interface BossActionMoment {
  stepIndex: number; step: BossStrike; stage: 'windup' | 'active' | 'recovery';
  progress: number; finished: boolean;
}
export class BossActionTimeline {
  constructor(readonly skill: BossSkill, readonly startedAt: number) {}
  get duration(): number {
    return this.skill.steps.reduce((sum, step) => sum + step.windup + step.active + step.recovery, 0);
  }
  at(now: number): BossActionMoment {
    let elapsed = Math.max(0, now - this.startedAt);
    for (let stepIndex = 0; stepIndex < this.skill.steps.length; stepIndex++) {
      const step = this.skill.steps[stepIndex];
      for (const stage of ['windup', 'active', 'recovery'] as const) {
        const duration = step[stage];
        if (elapsed < duration) return { stepIndex, step, stage, progress: elapsed / duration, finished: false };
        elapsed -= duration;
      }
    }
    const stepIndex = this.skill.steps.length - 1;
    return { stepIndex, step: this.skill.steps[stepIndex], stage: 'recovery', progress: 1, finished: true };
  }
}
