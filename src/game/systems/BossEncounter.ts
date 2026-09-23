import Phaser from 'phaser';
import type { ArenaConfig, BossHudState } from '../data/types';
import type { Boss } from '../entities/Boss';
import type { Player } from '../entities/Player';
import type { WorldView } from '../world/WorldView';
import type { Rect } from '../combat/AttackWindow';

export type EncounterState='dormant'|'active'|'defeated';
/** Arena and retry lifecycle are independent of the boss's attack selection. */
export class BossEncounter {
  state:EncounterState='dormant';
  startedAt=0;
  attempts=0;
  lastDuration=0;
  private walls:Phaser.Physics.Arcade.StaticGroup;
  private readonly colliders:Phaser.Physics.Arcade.Collider[]=[];
  constructor(private scene:Phaser.Scene,readonly arena:ArenaConfig,readonly boss:Boss,private player:Player,private world:WorldView,private onEnter:()=>void) {
    this.walls=scene.physics.add.staticGroup();
    for(const x of [arena.left,arena.right]) {
      const wall=scene.add.rectangle(x,arena.groundY/2,12,arena.groundY+220,0xffffff,0);
      scene.physics.add.existing(wall,true);this.walls.add(wall);
    }
    this.colliders.push(scene.physics.add.collider(player.sprite,this.walls),scene.physics.add.collider(boss.sprite,this.walls));
    this.lock(false);
  }
  get obstacles():Rect[] {
    return this.state==='active'?[this.arena.left,this.arena.right].map(x=>({x:x-6,y:0,width:12,height:this.arena.groundY+100})):[];
  }
  update(now:number):void {
    if(this.state==='dormant'&&this.player.alive&&this.player.x>=this.arena.triggerX) {
      this.state='active';this.startedAt=now;this.attempts++;
      if(this.player.x>this.arena.right-40)this.player.body.reset(this.arena.left+100,this.arena.groundY-40);
      this.lock(true);this.boss.engage(now);
      const camera=this.scene.cameras.main;
      camera.stopFollow();camera.pan((this.arena.left+this.arena.right)/2,360,450,'Sine.easeInOut');
      this.onEnter();
    }
    if(this.state==='active'&&!this.boss.alive)this.defeat(now);
  }
  defeat(now:number):void {
    if(this.state==='defeated')return;
    this.lastDuration=now-this.startedAt;this.state='defeated';this.lock(false);
    this.world.setExitOpen(true);
    this.scene.cameras.main.startFollow(this.player.sprite,true,0.08,0,-180,0);
  }
  reset(now:number):void {
    if(this.state==='defeated')return;
    this.state='dormant';this.lock(false);this.boss.resetEncounter(now);
  }
  private lock(locked:boolean):void {
    this.walls.getChildren().forEach(wall=>{(wall as Phaser.GameObjects.Rectangle & {body:Phaser.Physics.Arcade.StaticBody}).body.enable=locked;});
    this.world.setBossArenaLocked(locked);
  }
  snapshot():BossHudState {
    const c=this.boss.controller;
    return {visible:this.state==='active',name:this.boss.config.name,hp:this.boss.hp,maxHp:this.boss.maxHp,phase:c.phase,poise:this.boss.poise.current,maxPoise:this.boss.poise.max,state:this.boss.state,skill:c.currentSkill,transitioning:c.transitioning};
  }
  destroy():void {this.colliders.forEach(c=>c.destroy());this.walls.destroy(true,true);}
}
