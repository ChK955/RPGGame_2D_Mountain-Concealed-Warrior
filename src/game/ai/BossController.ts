import type { Boss } from '../entities/Boss';
import type { Player } from '../entities/Player';
import type { CombatSystem } from '../combat/CombatSystem';
import type { Facing, TelegraphCue } from '../data/types';
import { BOSS_RULES, bossSkillForPhase, type BossPhase } from '../config/boss';
import { BossActionTimeline, type BossActionMoment } from './BossActionTimeline';
import { bossPhaseForHealth, chooseBossSkill } from './BossActionSelector';

/** Boss decisions use the paused simulation clock; presentation consumes only cue data. */
export class BossController {
  phase: BossPhase = 1;
  currentSkill = '';
  transitioning = false;
  cue: TelegraphCue | null = null;
  private timeline: BossActionTimeline | null = null;
  private lockedFacing: Facing = -1;
  private transitionStartedAt = 0;
  private nextDecisionAt = 0;
  private launchedStep = -1;
  private stageKey = '';
  private wasStaggered = false;
  private history: string[] = [];
  private combat?: CombatSystem;

  constructor(private readonly boss: Boss, private readonly random: () => number = Math.random) {}

  reset(now: number): void {
    this.stop(this.combat);
    this.phase = 1;
    this.transitioning = false;
    this.wasStaggered = false;
    this.transitionStartedAt = 0;
    this.nextDecisionAt = now + BOSS_RULES.openingGrace;
    this.history = [];
  }

  /** Clear launched projectiles on death, reset or phase change as well as pending melee. */
  stop(combat = this.combat): void {
    combat?.cancel(this.boss, true);
    this.timeline = null;
    this.currentSkill = '';
    this.launchedStep = -1;
    this.stageKey = '';
    this.publish(null);
    this.boss.attackStage = 'none';
    this.boss.body.setVelocityX(0);
  }

  update(now: number, player: Player, combat: CombatSystem): void {
    this.combat = combat;
    if (!this.boss.alive || !player.alive) { this.stop(combat); return; }

    const requiredPhase = bossPhaseForHealth(this.boss.hp, this.boss.maxHp);
    if (requiredPhase > this.phase) {
      this.stop(combat);
      this.phase = requiredPhase;
      this.transitioning = true;
      this.transitionStartedAt = now;
      this.wasStaggered = false;
      this.boss.poise.reset();
    }
    if (this.transitioning) {
      const progress = Math.min(1, (now - this.transitionStartedAt) / BOSS_RULES.transition);
      this.boss.body.setVelocityX(0);
      this.boss.state = 'Transition';
      this.currentSkill = 'transition';
      this.publish({ kind: 'transition', phase: 'windup', progress, range: 220,
        direction: this.boss.facing, label: this.phase === 3 ? '玄骸 · 鬼焰尽燃' : '玄骸 · 煞气觉醒', dangerous: false });
      if (progress >= 1) {
        this.transitioning = false;
        this.currentSkill = '';
        this.publish(null);
        this.boss.state = 'Idle';
        this.nextDecisionAt = now + BOSS_RULES.postStaggerGrace;
      }
      this.boss.animate();
      return;
    }

    if (this.boss.poise.isStaggered(now)) {
      if (!this.wasStaggered) {
        combat.cancel(this.boss, false);
        this.timeline = null;
        this.launchedStep = -1;
        this.stageKey = '';
      }
      this.wasStaggered = true;
      this.currentSkill = '';
      this.boss.attackStage = 'none';
      this.publish(null);
      return;
    }
    if (this.wasStaggered) {
      this.wasStaggered = false;
      this.nextDecisionAt = now + BOSS_RULES.postStaggerGrace;
    }

    if (this.timeline) {
      const moment = this.timeline.at(now);
      if (!moment.finished) { this.act(moment, combat); return; }
      combat.cancel(this.boss, false);
      this.nextDecisionAt = now + this.timeline.skill.cooldown;
      this.timeline = null;
      this.currentSkill = '';
      this.boss.attackStage = 'none';
      this.publish(null);
    }

    const dx = player.x - this.boss.x;
    this.boss.face(dx);
    if (now < this.nextDecisionAt) {
      this.boss.state = 'Idle'; this.boss.body.setVelocityX(0); this.boss.animate(); return;
    }
    const distance = Math.abs(dx);
    const skillId = chooseBossSkill(this.phase, distance, this.history, this.random);
    if (!skillId || Math.abs(player.centerY - this.boss.centerY) > 170) {
      this.boss.state = 'Chase';
      this.boss.advance(this.boss.config.speed * (this.phase === 3 ? BOSS_RULES.phase3SpeedMultiplier : 1));
      this.boss.animate(); return;
    }
    const skill = bossSkillForPhase(skillId, this.phase);
    this.timeline = new BossActionTimeline(skill, now);
    this.currentSkill = skillId;
    this.lockedFacing = this.boss.facing;
    this.launchedStep = -1;
    this.stageKey = '';
    this.history.push(skillId);
    this.history = this.history.slice(-6);
    this.boss.attackStartedAt = now;
    this.boss.attackEndsAt = now + this.timeline.duration;
    this.act(this.timeline.at(now), combat);
  }

  private act(moment: BossActionMoment, combat: CombatSystem): void {
    if (!this.timeline) return;
    const { step, stepIndex, stage, progress } = moment;
    const skill = this.timeline.skill;
    const key = `${stepIndex}:${stage}`;
    const entered = this.stageKey !== key;
    this.stageKey = key;
    this.boss.face(this.lockedFacing);
    this.boss.attackStage = stage;
    this.boss.state = stage === 'windup' ? 'Telegraph' : stage === 'active' ? 'Attack' : 'Recovery';
    this.boss.body.setVelocityX(0);
    if (stage === 'active') {
      if (step.speed) this.boss.advance(step.speed);
      if (this.launchedStep !== stepIndex) {
        this.launchedStep = stepIndex;
        // A late render frame never lengthens the active window into recovery.
        const remainingActive = Math.max(1, step.active * (1 - progress));
        if (skill.id === 'shockwave') {
          for (const facing of [-1, 1] as const) {
            combat.launchProjectile(this.boss, {
              windup: 0, lifetime: BOSS_RULES.shockwaveLifetime,
              damage: step.damage, knockback: step.knockback,
              width: BOSS_RULES.shockwaveWidth, height: BOSS_RULES.shockwaveHeight,
              speed: BOSS_RULES.shockwaveSpeed, facing,
              kind: 'shockwave', grounded: true, piercing: false,
            });
          }
        } else {
          combat.melee(this.boss, { ...step, active: remainingActive, windup: 0, recovery: 0,
            kind: skill.id, facing: this.lockedFacing });
        }
      }
    } else if (entered) {
      // Previous strikes end before the next tell; ground waves retain their own lifetime.
      combat.cancel(this.boss, false);
    }
    const count = skill.steps.length > 1 ? ` · ${stepIndex + 1}/${skill.steps.length}` : '';
    this.publish({ kind: skill.id, phase: stage, progress,
      range: step.range + (stage === 'windup' ? (step.speed ?? 0) * step.active / 1000 : 0),
      direction: this.lockedFacing, label: `${skill.label}${count}`, dangerous: stage !== 'recovery' });
    this.boss.animate(entered);
  }

  private publish(cue: TelegraphCue | null): void {
    this.cue = cue;
    this.boss.combatCue = cue;
  }
}
