import type Phaser from 'phaser';
import { Actor } from './Actor';
import { DashController } from '../components/DashController';
import { DASH, PHYSICS, PLAYER_ATTACK, SKILLS } from '../config/balance';
import type { GameState } from '../data/GameState';
import type { Facing, Point } from '../data/types';
import type { InputIntent } from '../input/InputController';
import type { CombatSystem } from '../combat/CombatSystem';

export class Player extends Actor {
  readonly faction = 'player' as const;
  readonly dash = new DashController();
  skillReadyAt = 0;
  attackReadyAt = 0;
  private lastGroundedAt = -1000;
  private jumpBufferedUntil = -1000;
  constructor(scene:Phaser.Scene, readonly gameState:GameState, spawn:Point) {
    super(scene,'player',spawn.x,spawn.y,'player-main');
    this.body.setMaxVelocity(DASH.speed,PHYSICS.maxFallSpeed);
    this.body.setDragX(PHYSICS.drag);
  }
  get hp():number { return this.gameState.stats.hp; }
  get maxHp():number { return this.gameState.stats.maxHp; }
  update(input:InputIntent,now:number,combat:CombatSystem):void {
    if (!this.alive) { this.animate(); return; }
    const body = this.body;
    if (this.grounded) this.lastGroundedAt = now;
    if (input.jump) this.jumpBufferedUntil = now + PHYSICS.jumpBufferMs;
    body.setAllowGravity(true);
    if (now < this.hurtUntil) { this.animate(); return; }
    this.sprite.clearTint();
    this.sprite.setAlpha(now < this.invulnerableUntil && Math.floor(now/65)%2 === 0 ? 0.5 : 1);
    if (this.dash.active(now)) {
      body.setAllowGravity(false).setAccelerationX(0).setVelocity(this.dash.facing*DASH.speed,0);
      this.state = 'Dash'; this.animate(); return;
    }
    if (this.state === 'Dash') body.setVelocityX(this.facing*this.gameState.stats.moveSpeed);
    if (now < this.lockedUntil) { body.setAccelerationX(0); this.animate(); return; }
    this.face(input.move);
    if (input.dash && this.dash.start(now,this.facing)) {
      combat.cancel(this); this.state='Dash'; body.setAllowGravity(false).setAccelerationX(0).setVelocity(this.facing*DASH.speed,0); this.animate(); return;
    }
    if (input.skill && now >= this.skillReadyAt) {
      const skill=SKILLS.swordWave;
      this.state='Skill'; this.lockedUntil=now+skill.windup+skill.recovery;
      this.skillReadyAt=now+skill.cooldown;
      body.setAccelerationX(0).setVelocityX(this.facing*35);
      combat.projectile(this,skill,Math.round(this.gameState.stats.attackDamage*skill.damageMultiplier));
      this.animate(true); return;
    }
    if (input.attack && now >= this.attackReadyAt) {
      this.state='Attack';
      this.lockedUntil=now+PLAYER_ATTACK.windup+PLAYER_ATTACK.active+PLAYER_ATTACK.recovery;
      this.attackReadyAt=now+PLAYER_ATTACK.cooldown;
      body.setAccelerationX(0).setVelocityX(this.facing*70);
      combat.melee(this,{...PLAYER_ATTACK,damage:this.gameState.stats.attackDamage});
      this.animate(true); return;
    }
    if (now<=this.jumpBufferedUntil && now-this.lastGroundedAt<=PHYSICS.coyoteMs) {
      body.setVelocityY(-this.gameState.stats.jumpForce);
      this.jumpBufferedUntil=-1000; this.lastGroundedAt=-1000;
    }
    if (input.move !== 0) {
      body.setAccelerationX(input.move*PHYSICS.acceleration);
      if (Math.abs(body.velocity.x)>this.gameState.stats.moveSpeed) body.setVelocityX(input.move*this.gameState.stats.moveSpeed);
    } else body.setAccelerationX(0);
    this.state=body.velocity.y < -40 ? 'Jump' : !this.grounded && body.velocity.y>40 ? 'Fall' : Math.abs(body.velocity.x)>18 ? 'Run' : 'Idle';
    this.animate();
  }
  receiveDamage(amount:number,direction:Facing,now:number,knockback:number):number {
    if (!this.alive || now<this.invulnerableUntil || this.dash.invulnerable(now)) return 0;
    const dealt=this.gameState.takeDamage(amount);
    if (this.hp<=0) this.die();
    else { this.hurt(now,direction,knockback); this.invulnerableUntil=now+650; this.lockedUntil=0; }
    return dealt;
  }
  respawn(point:Point,now:number):void {
    this.gameState.respawn(); this.state='Idle'; this.lockedUntil=this.hurtUntil=0;
    this.skillReadyAt=this.attackReadyAt=0; this.dash.reset();
    this.lastGroundedAt=this.jumpBufferedUntil=-1000;
    this.sprite.setActive(true).setVisible(true).setAlpha(1).clearTint();
    this.body.enable=true; this.body.reset(point.x,point.y); this.body.setAllowGravity(true);
    this.invulnerableUntil=now+1800; this.animate();
  }
}
