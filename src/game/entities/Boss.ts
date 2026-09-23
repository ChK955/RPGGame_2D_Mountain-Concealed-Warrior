import type Phaser from 'phaser';
import { Enemy } from './Enemy';
import { BossController } from '../ai/BossController';
import type { EnemyConfig, EnemySpawn, Facing } from '../data/types';
import type { Player } from './Player';
import type { CombatSystem } from '../combat/CombatSystem';

/** Shares damage/physics/poise with Enemy while owning an independent action controller. */
export class Boss extends Enemy {
  readonly controller: BossController;
  engaged = false;
  private combat?: CombatSystem;

  constructor(scene: Phaser.Scene, spawn: EnemySpawn, config: EnemyConfig) {
    super(scene, spawn, config);
    this.controller = new BossController(this);
    this.body.setMaxVelocity(850, 900);
  }

  engage(now: number): void {
    if (!this.alive || this.engaged) return;
    this.engaged = this.alerted = true;
    this.controller.reset(now);
  }

  override update(now: number, player: Player, combat: CombatSystem): void {
    this.combat = combat;
    this.updateStatus(now);
    if (!this.alive) { this.controller.stop(combat); return; }
    if (!this.engaged) { this.body.setVelocityX(0); this.animate(); return; }
    // The controller checks phase thresholds before stagger, so transitions cannot be delayed by stun.
    this.controller.update(now, player, combat);
  }

  advance(speed: number): void { this.moveSafely(speed); }

  override receiveDamage(amount: number, direction: Facing, now: number, knockback: number, poiseDamage = 0): number {
    // The arena seal prevents offscreen sword waves from bypassing the encounter.
    if (!this.engaged) return 0;
    // Phase tells remain readable while HP damage is still allowed as a punish opportunity.
    return super.receiveDamage(amount, direction, now, knockback, this.controller.transitioning ? 0 : poiseDamage);
  }

  override die(): void {
    super.die();
    this.engaged = false;
    this.controller?.stop(this.combat);
  }

  resetEncounter(now: number): void {
    this.combat?.cancel(this, true);
    this.engaged = false;
    this.resetPosition(true);
    this.alerted = false;
    this.controller.reset(now);
  }
}
