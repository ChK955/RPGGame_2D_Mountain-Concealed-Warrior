import type { ApeBoss } from '../entities/ApeBoss';
import type { Player } from '../entities/Player';
import type { CombatSystem } from '../combat/CombatSystem';
import type { Facing, TelegraphCue } from '../data/types';
import {
  APE_RULES, APE_SKILLS, apePhaseForHealth, chooseApeSkill,
  type ApePhase, type ApeSkill, type ApeSkillId,
} from '../config/ape';

interface ApeAction {
  skill: ApeSkill;
  startedAt: number;
  facing: Facing;
  targetX: number;
  leapStarted: boolean;
  launched: boolean;
  stageKey: string;
}

/** Independent ape decisions; cues and simulation time keep every attack readable. */
export class ApeController {
  phase: ApePhase = 1;
  currentSkill = '';
  transitioning = false;
  cue: TelegraphCue | null = null;
  private action: ApeAction | null = null;
  private transitionStartedAt = 0;
  private nextDecisionAt = 0;
  private wasStaggered = false;
  private history: ApeSkillId[] = [];
  private combat?: CombatSystem;

  constructor(private readonly boss: ApeBoss, private readonly random: () => number = Math.random) {}

  get landingTargetX(): number | null {
    return this.action?.skill.id === 'leap' ? this.action.targetX : null;
  }

  reset(now: number): void {
    this.stop(this.combat);
    this.phase = 1;
    this.transitioning = false;
    this.transitionStartedAt = 0;
    this.nextDecisionAt = now + APE_RULES.openingGrace;
    this.wasStaggered = false;
    this.history = [];
  }

  stop(combat = this.combat): void {
    combat?.cancel(this.boss, true);
    this.action = null;
    this.currentSkill = '';
    this.boss.rangedAim = null;
    this.boss.attackStage = 'none';
    this.boss.body.setVelocityX(0);
    this.publish(null);
  }

  update(now: number, player: Player, combat: CombatSystem): void {
    this.combat = combat;
    if (!this.boss.alive || !player.alive) { this.stop(combat); return; }

    const requiredPhase = apePhaseForHealth(this.boss.hp, this.boss.maxHp);
    if (requiredPhase > this.phase) {
      this.stop(combat);
      this.phase = requiredPhase;
      this.transitioning = true;
      this.transitionStartedAt = now;
      this.wasStaggered = false;
      this.boss.poise.reset();
    }
    if (this.transitioning) {
      const progress = Math.min(1, Math.max(0, (now - this.transitionStartedAt) / APE_RULES.transition));
      this.boss.state = 'Transition';
      this.boss.body.setVelocityX(0);
      this.currentSkill = 'transition';
      this.publish({ kind: 'transition', phase: 'windup', progress, range: 240,
        direction: this.boss.facing, label: '魇猿 · 赤目狂化', dangerous: false });
      if (progress >= 1) {
        this.transitioning = false;
        this.currentSkill = '';
        this.boss.state = 'Idle';
        this.nextDecisionAt = now + APE_RULES.postStaggerGrace;
        this.publish(null);
      }
      this.boss.animate();
      return;
    }

    if (this.boss.poise.isStaggered(now)) {
      if (!this.wasStaggered) {
        combat.cancel(this.boss, false);
        this.action = null;
        this.boss.rangedAim = null;
      }
      this.wasStaggered = true;
      this.currentSkill = '';
      this.boss.attackStage = 'none';
      this.publish(null);
      return;
    }
    if (this.wasStaggered) {
      this.wasStaggered = false;
      this.nextDecisionAt = now + APE_RULES.postStaggerGrace;
    }

    if (this.action) {
      const duration = this.duration(this.action.skill);
      if (now - this.action.startedAt < duration) {
        this.act(now, combat, player);
        return;
      }
      combat.cancel(this.boss, false);
      this.nextDecisionAt = now + this.action.skill.cooldown * (this.phase === 2 ? APE_RULES.phase2CooldownMultiplier : 1);
      this.action = null;
      this.currentSkill = '';
      this.boss.rangedAim = null;
      this.boss.attackStage = 'none';
      this.publish(null);
    }

    const dx = player.x - this.boss.x;
    this.boss.face(dx);
    if (now < this.nextDecisionAt) {
      this.boss.state = 'Idle';
      this.boss.body.setVelocityX(0);
      this.boss.animate();
      return;
    }
    const distance = Math.abs(dx);
    const skillId = chooseApeSkill(this.phase, distance, this.history, this.random);
    if (!skillId || Math.abs(player.centerY - this.boss.centerY) > 170) {
      this.boss.state = 'Chase';
      this.boss.advance(this.boss.config.speed * (this.phase === 2 ? APE_RULES.phase2SpeedMultiplier : 1));
      this.boss.animate();
      return;
    }
    const skill = APE_SKILLS[skillId];
    const targetX = Math.max(this.boss.spawn.patrolLeft + 60,
      Math.min(this.boss.spawn.patrolRight - 60, player.x));
    this.action = { skill, startedAt: now, facing: this.boss.facing,
      targetX, leapStarted: false, launched: false, stageKey: '' };
    this.boss.rangedAim = null;
    this.currentSkill = skillId;
    this.history.push(skillId);
    this.history = this.history.slice(-6);
    this.boss.attackStartedAt = now;
    this.boss.attackEndsAt = now + this.duration(skill);
    this.act(now, combat, player);
  }

  private act(now: number, combat: CombatSystem, player: Player): void {
    const action = this.action;
    if (!action) return;
    const { skill } = action;
    const elapsed = Math.max(0, now - action.startedAt);
    const anticipation = skill.windup + skill.travel;
    const stage: 'windup' | 'active' | 'recovery' = elapsed < anticipation ? 'windup'
      : elapsed < anticipation + skill.active ? 'active' : 'recovery';
    const key = skill.id === 'leap' && elapsed >= skill.windup && stage === 'windup' ? 'leap-flight' : stage;
    const entered = key !== action.stageKey;
    action.stageKey = key;
    if (skill.id === 'rock' && stage === 'windup') {
      action.facing = player.x >= this.boss.x ? 1 : -1;
      this.boss.rangedAim = { x: player.x, y: player.centerY };
    }
    this.boss.face(action.facing);
    this.boss.attackStage = stage;
    this.boss.state = stage === 'windup' ? 'Telegraph' : stage === 'active' ? 'Attack' : 'Recovery';

    if (skill.id === 'leap' && elapsed >= skill.windup && stage === 'windup') {
      if (!action.leapStarted) {
        action.leapStarted = true;
        this.boss.body.setVelocityY(-APE_RULES.leapJumpSpeed);
      }
      const remain = action.targetX - this.boss.x;
      if (Math.abs(remain) > 12) this.boss.advance(Math.min(APE_RULES.leapApproachSpeed, Math.abs(remain) * 1000 / Math.max(100, anticipation - elapsed)));
      else this.boss.body.setVelocityX(0);
    } else {
      this.boss.body.setVelocityX(0);
    }

    if (stage === 'active' && !action.launched) {
      action.launched = true;
      const remaining = Math.max(1, skill.active - (elapsed - anticipation));
      if (skill.id === 'leap') {
        // The destination is fixed at windup start; no invisible mid-air tracking.
        this.boss.landAt(action.targetX, APE_RULES.groundY);
        combat.melee(this.boss, { kind: 'smash', windup: 0, active: remaining, recovery: 0,
          range: skill.range, height: skill.height, damage: skill.damage,
          knockback: skill.knockback, facing: action.facing, offsetX: -skill.range / 2 });
      } else if (skill.id === 'rock') {
        // Aim once at release; the moving rock then keeps this trajectory.
        const aim = { x: player.x, y: player.centerY };
        this.boss.rangedAim = aim;
        action.facing = aim.x >= this.boss.x ? 1 : -1;
        this.boss.face(action.facing);
        const launchX = this.boss.x + action.facing * (12 + 42 / 2);
        const dx = aim.x - launchX, dy = aim.y - this.boss.centerY;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const speed = skill.speed!;
        combat.launchProjectile(this.boss, { kind: 'rock', windup: 0,
          lifetime: skill.lifetime!, speed: speed * Math.abs(dx) / distance,
          speedY: speed * dy / distance, damage: skill.damage,
          width: 42, height: skill.height, knockback: skill.knockback,
          facing: action.facing, piercing: false });
      } else if (skill.id === 'roar') {
        this.boss.roarFeedback();
        for (const facing of [-1, 1] as const) {
          combat.launchProjectile(this.boss, { kind: 'roar', windup: 0,
            lifetime: APE_RULES.roarWaveLifetime, speed: APE_RULES.roarWaveSpeed,
            damage: skill.damage, width: 48, height: skill.height,
            knockback: skill.knockback, facing, grounded: true, piercing: false });
        }
      } else {
        combat.melee(this.boss, { kind: 'slash', windup: 0, active: remaining, recovery: 0,
          range: skill.range, height: skill.height, damage: skill.damage,
          knockback: skill.knockback, facing: action.facing });
      }
    } else if (entered && stage === 'recovery') {
      combat.cancel(this.boss, false);
    }

    const progress = stage === 'windup' ? elapsed / anticipation
      : stage === 'active' ? (elapsed - anticipation) / skill.active
        : (elapsed - anticipation - skill.active) / skill.recovery;
    this.publish({ kind: skill.id === 'claw' ? 'slash' : skill.id === 'leap' ? 'smash' : skill.id,
      phase: stage, progress: Math.min(1, Math.max(0, progress)),
      range: skill.id === 'leap' ? Math.max(skill.range, Math.abs(action.targetX - this.boss.x)) : skill.range,
      direction: action.facing,
      label: skill.id === 'leap' && key === 'leap-flight' ? '跃起 · 落点已锁定' : skill.label,
      dangerous: stage === 'active' });
    this.boss.animate(entered);
  }

  private duration(skill: ApeSkill): number {
    return skill.windup + skill.travel + skill.active + skill.recovery;
  }

  private publish(cue: TelegraphCue | null): void {
    this.cue = cue;
    this.boss.combatCue = cue;
  }
}
