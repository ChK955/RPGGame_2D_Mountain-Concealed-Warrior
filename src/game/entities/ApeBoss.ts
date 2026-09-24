import type Phaser from 'phaser';
import { Enemy } from './Enemy';
import { ApeController } from '../ai/ApeController';
import type { EnemyConfig, EnemySpawn, Facing } from '../data/types';
import type { Player } from './Player';
import type { CombatSystem } from '../combat/CombatSystem';

/** The second boss shares Enemy physics and poise but has its own move vocabulary. */
export class ApeBoss extends Enemy {
  readonly controller: ApeController;
  engaged = false;
  private combat?: CombatSystem;

  constructor(scene: Phaser.Scene, spawn: EnemySpawn, config: EnemyConfig) {
    super(scene, spawn, config);
    this.controller = new ApeController(this);
    this.body.setMaxVelocity(850, 950);
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
    this.controller.update(now, player, combat);
  }

  advance(speed: number): void { this.moveSafely(speed); }

  landAt(x: number, groundY: number): void {
    const destination = Math.max(this.spawn.patrolLeft, Math.min(this.spawn.patrolRight, x));
    this.body.reset(destination, this.y + groundY - this.body.bottom);
    this.body.setVelocity(0, 0);
  }

  roarFeedback(): void { this.scene.cameras.main.shake(150, 0.002); }

  override receiveDamage(amount: number, direction: Facing, now: number, knockback: number, poiseDamage = 0): number {
    if (!this.engaged) return 0;
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
