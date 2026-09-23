import type Phaser from 'phaser';
import { Actor } from './Actor';
import { PoiseMeter } from '../components/PoiseMeter';
import { ENEMY_BEHAVIOR } from '../config/balance';
import type { AttackKind, EnemyConfig, EnemySpawn, Facing, TelegraphCue } from '../data/types';
import type { EnemyTactics } from '../ai/EnemyCoordinator';
import type { Player } from './Player';
import type { CombatSystem } from '../combat/CombatSystem';

/** Ordinary hit feedback preserves commitments; only a poise break interrupts an action. */
export class Enemy extends Actor {
  readonly faction = 'enemy' as const;
  readonly poise: PoiseMeter;
  combatCue: TelegraphCue | null = null;
  alerted = false;
  staggeredAt = Number.NEGATIVE_INFINITY;
  attackStage: 'none' | 'windup' | 'active' | 'recovery' = 'none';
  attackStartedAt = 0;
  attackEndsAt = 0;
  protected health: number;
  protected nextAttackAt = 0;
  private idleUntil = 0;
  private deathAt: number | null = null;
  private flashUntil = 0;
  private attackFacing: Facing = 1;

  constructor(scene: Phaser.Scene, readonly spawn: EnemySpawn, readonly config: EnemyConfig) {
    super(scene, spawn.id, spawn.x, spawn.y, config.assetKey);
    this.health = config.maxHp;
    this.poise = new PoiseMeter(config.poise);
    this.sprite.setScale(this.sprite.scaleX * config.scale, this.sprite.scaleY * config.scale);
    this.sprite.setTint(config.tint);
    this.body.setDragX(1100).setMaxVelocity(Math.max(config.speed * 2, config.lungeSpeed ?? 0), 900);
    this.face(-1);
  }

  get hp(): number { return this.health; }
  get maxHp(): number { return this.config.maxHp; }

  update(now: number, player: Player, combat: CombatSystem, tactics?: EnemyTactics): void {
    if (!player.alive && this.alive) {
      combat.cancel(this);
      this.clearAction();
      this.alerted = false;
      this.body.setVelocityX(0);
    }
    if (this.updateStatus(now)) return;
    if (!player.alive) { this.state = 'Idle'; this.animate(); return; }
    if (this.updateAction(now, combat)) return;

    const dx = player.x - this.x;
    const distance = Math.abs(dx);
    const sameLevel = Math.abs(player.centerY - this.centerY) < ENEMY_BEHAVIOR.sameLevelTolerance;
    const detection = this.alerted ? this.config.leashRange : this.config.detectionRange;
    this.alerted = sameLevel && (tactics?.alert ?? distance < detection);
    if (this.alerted) {
      this.face(dx);
      const canAttack = tactics?.canAttack ?? true;
      const preferredRange = this.config.preferredRange ?? this.config.attackRange * 0.8;
      const retreatBlocked = dx > 0 ? this.x <= this.spawn.patrolLeft + 4 : this.x >= this.spawn.patrolRight - 4;
      if (!canAttack) {
        const hold = tactics?.holdDistance ?? ENEMY_BEHAVIOR.holdDistance;
        this.state = 'Alert';
        this.moveSafely(distance < hold - 25 ? -this.config.speed * 0.55 : distance > hold + 25 ? this.config.speed * 0.65 : 0);
      } else if (this.config.archetype === 'ranged' && !retreatBlocked && distance < preferredRange * ENEMY_BEHAVIOR.retreatRangeRatio) {
        this.state = 'Chase';
        this.moveSafely(-this.config.speed);
      } else if (distance <= this.config.attackRange && now >= this.nextAttackAt) {
        this.startAttack(now, combat);
      } else if (distance > preferredRange + (this.config.archetype === 'ranged' ? ENEMY_BEHAVIOR.rangeTolerance : 0)) {
        this.state = 'Chase'; this.moveSafely(this.config.speed);
      } else {
        this.state = 'Alert'; this.body.setVelocityX(0);
      }
    } else if (now < this.idleUntil) {
      this.state = 'Idle'; this.body.setVelocityX(0);
    } else {
      this.state = 'Patrol';
      if (this.x <= this.spawn.patrolLeft + 4) { this.face(1); this.idleUntil = now + ENEMY_BEHAVIOR.patrolPause; }
      if (this.x >= this.spawn.patrolRight - 4) { this.face(-1); this.idleUntil = now + ENEMY_BEHAVIOR.patrolPause; }
      this.moveSafely(this.config.speed * ENEMY_BEHAVIOR.patrolSpeedMultiplier);
    }
    this.animate();
  }

  /** Shared status priority used by the boss without running ordinary enemy AI. */
  protected updateStatus(now: number): boolean {
    this.poise.update(now);
    if (!this.alive) {
      this.deathAt ??= now;
      this.sprite.setAlpha(Math.max(0, 1 - (now - this.deathAt) / 750));
      if (now - this.deathAt > 800) this.sprite.setVisible(false);
      return true;
    }
    if (now >= this.flashUntil) this.sprite.setTint(this.config.tint);
    if (this.poise.isStaggered(now)) {
      this.state = 'Stagger'; this.animate(); return true;
    }
    if (this.state === 'Stagger') {
      this.state = 'Idle'; this.lockedUntil = this.hurtUntil = 0;
      this.body.setVelocityX(0);
    }
    return false;
  }

  private startAttack(now: number, combat: CombatSystem): void {
    const c = this.config;
    this.attackStartedAt = now;
    this.attackEndsAt = now + c.windup + c.active + c.recovery;
    this.lockedUntil = this.attackEndsAt;
    this.nextAttackAt = Math.max(now + c.cooldown, this.attackEndsAt);
    this.attackFacing = this.facing;
    this.attackStage = 'windup';
    this.state = 'Telegraph'; this.body.setVelocityX(0);
    if (c.archetype === 'ranged') {
      combat.launchProjectile(this, {
        kind: 'bolt', windup: c.windup, lifetime: c.projectileLifetime ?? 1800,
        damage: c.damage, width: ENEMY_BEHAVIOR.projectileWidth, height: c.attackHeight,
        speed: c.projectileSpeed ?? 400, knockback: c.knockback, facing: this.attackFacing,
      });
    } else {
      combat.melee(this, {
        kind: this.attackKind, windup: c.windup, active: c.active, recovery: c.recovery,
        range: c.archetype === 'fast' ? ENEMY_BEHAVIOR.fastStrikeRange : c.attackRange,
        height: c.attackHeight, damage: c.damage, knockback: c.knockback, facing: this.attackFacing,
      });
    }
    this.publishCue(0, 'windup');
    this.animate(true);
  }

  private updateAction(now: number, combat: CombatSystem): boolean {
    if (this.attackStage === 'none') return false;
    if (now >= this.attackEndsAt) {
      combat.cancel(this, false);
      this.clearAction();
      return false;
    }
    const age = now - this.attackStartedAt;
    const c = this.config;
    this.face(this.attackFacing);
    if (age < c.windup) {
      this.attackStage = 'windup'; this.state = 'Telegraph'; this.body.setVelocityX(0);
      this.publishCue(age / c.windup, 'windup');
    } else if (age < c.windup + c.active) {
      this.attackStage = 'active'; this.state = 'Attack';
      this.moveSafely(c.archetype === 'fast' && age < c.windup + (c.lungeDuration ?? c.active) ? c.lungeSpeed ?? 0 : 0);
      this.publishCue((age - c.windup) / c.active, 'active');
    } else {
      this.attackStage = 'recovery'; this.state = 'Recovery'; this.body.setVelocityX(0);
      this.publishCue((age - c.windup - c.active) / c.recovery, 'recovery');
    }
    this.animate();
    return true;
  }

  private get attackKind(): AttackKind {
    return this.config.archetype === 'fast' ? 'lunge' : this.config.archetype === 'heavy' ? 'heavy' : this.config.archetype === 'ranged' ? 'bolt' : 'slash';
  }

  private publishCue(progress: number, phase: TelegraphCue['phase']): void {
    const labels: Partial<Record<AttackKind, string>> = { slash: '挥斩', lunge: '突刺', heavy: '重斩', bolt: '弩箭' };
    this.combatCue = { kind: this.attackKind, phase, progress: Math.max(0, Math.min(1, progress)),
      range: this.config.attackRange, direction: this.attackFacing, label: labels[this.attackKind] ?? '攻击', dangerous: phase === 'active' };
  }

  private clearAction(): void {
    this.attackStage = 'none'; this.combatCue = null;
    this.attackStartedAt = this.attackEndsAt = this.lockedUntil = 0;
  }

  /** Patrol bounds describe a contiguous safe floor; brake before a lunge crosses its edge. */
  protected moveSafely(speed: number): void {
    let velocity = this.facing * speed;
    if (velocity < 0) velocity = Math.max(velocity, -Math.max(0, this.x - this.spawn.patrolLeft) / 0.05);
    if (velocity > 0) velocity = Math.min(velocity, Math.max(0, this.spawn.patrolRight - this.x) / 0.05);
    this.body.setVelocityX(velocity);
  }

  receiveDamage(amount: number, direction: Facing, now: number, knockback: number, poiseDamage = 0): number {
    if (!this.alive || now < this.invulnerableUntil || !Number.isFinite(amount) || amount <= 0) return 0;
    const dealt = Math.min(this.health, amount); this.health -= dealt;
    if (this.health <= 0) {
      this.clearAction(); this.alerted = false; this.die();
      return dealt;
    }
    const broken = this.poise.damage(poiseDamage, now);
    this.flashUntil = now + (broken ? ENEMY_BEHAVIOR.staggerFlash : ENEMY_BEHAVIOR.hitFlash);
    this.sprite.setTintFill(broken ? 0xffd282 : 0xffeee0);
    if (broken) {
      this.clearAction();
      this.state = 'Stagger'; this.staggeredAt = now;
      this.lockedUntil = this.poise.staggerUntil;
      this.nextAttackAt = Math.max(this.nextAttackAt, this.poise.staggerUntil + 120);
      this.body.setAccelerationX(0).setVelocityX(direction * knockback * ENEMY_BEHAVIOR.staggerKnockbackMultiplier);
      this.animate(true);
    } else if (this.attackStage === 'none' && this.state !== 'Stagger' && this.state !== 'Transition') {
      // Small displacement gives feedback without erasing windup, facing, or recovery.
      this.body.setVelocityX(direction * Math.min(ENEMY_BEHAVIOR.hitKnockbackMax, knockback * ENEMY_BEHAVIOR.hitKnockbackMultiplier));
    }
    return dealt;
  }

  resetPosition(fullHealth = false): void {
    if (!this.alive && !fullHealth) return;
    if (fullHealth) this.health = this.config.maxHp;
    this.clearAction(); this.poise.reset(); this.alerted = false;
    this.hurtUntil = this.invulnerableUntil = this.nextAttackAt = this.idleUntil = this.flashUntil = 0;
    this.staggeredAt = Number.NEGATIVE_INFINITY; this.deathAt = null;
    this.state = 'Idle'; this.body.enable = true;
    this.body.reset(this.spawn.x, this.spawn.y); this.body.setVelocity(0, 0);
    this.sprite.setActive(true).setVisible(true).setAlpha(1).setTint(this.config.tint);
    this.face(-1); this.animate(true);
  }
}
