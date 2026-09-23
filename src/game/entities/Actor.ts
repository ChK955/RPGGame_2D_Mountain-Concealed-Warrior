import Phaser from 'phaser';
import { createActorSprite } from '../assets/manifest';
import { playActorAnimation } from '../animations/animationConfig';
import type { ActorState, Facing } from '../data/types';
import type { Rect } from '../combat/AttackWindow';

export abstract class Actor {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  state: ActorState = 'Idle';
  facing: Facing = 1;
  protected lockedUntil = 0;
  protected hurtUntil = 0;
  protected invulnerableUntil = 0;
  abstract readonly faction: 'player' | 'enemy';
  abstract get hp(): number;
  abstract get maxHp(): number;
  constructor(readonly scene: Phaser.Scene, readonly id: string, x: number, y: number, readonly assetKey: string) {
    this.sprite = createActorSprite(scene, x, y, assetKey);
    this.sprite.setDepth(20);
    this.body.setCollideWorldBounds(true);
  }
  get body(): Phaser.Physics.Arcade.Body { return this.sprite.body as Phaser.Physics.Arcade.Body; }
  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }
  get alive(): boolean { return this.hp > 0 && this.state !== 'Death'; }
  get interrupted(): boolean { return !this.alive || this.state === 'Hurt' || this.state === 'Stagger' || this.state === 'Transition'; }
  get bounds(): Rect { return {x:this.body.x,y:this.body.y,width:this.body.width,height:this.body.height}; }
  get centerY(): number { return this.body.center.y; }
  get grounded(): boolean { return this.body.blocked.down || this.body.touching.down; }
  face(direction: number): void {
    if (direction !== 0) this.facing = direction > 0 ? 1 : -1;
    this.sprite.setFlipX(this.facing < 0);
  }
  animate(restart = false): void { playActorAnimation(this.sprite, this.assetKey, this.state, restart); }
  abstract receiveDamage(amount: number, direction: Facing, now: number, knockback: number, poiseDamage?: number): number;
  protected hurt(now: number, direction: Facing, knockback: number): void {
    this.state = 'Hurt';
    this.hurtUntil = now + 230;
    this.invulnerableUntil = now + 260;
    this.body.setAccelerationX(0);
    this.body.setVelocityX(direction * knockback);
    this.body.setVelocityY(-110);
    this.sprite.setTintFill(0xffe6b3);
    this.animate(true);
  }
  die(): void {
    this.state = 'Death';
    this.body.stop();
    this.body.enable = false;
    this.sprite.clearTint();
    this.animate(true);
  }
  destroy(): void { this.sprite.destroy(); }
}
