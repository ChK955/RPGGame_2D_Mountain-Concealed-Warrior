import type Phaser from 'phaser';
import { GameState } from '../data/GameState';
import type { HudSnapshot, MapDefinition } from '../data/types';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { EnemyCoordinator } from '../ai/EnemyCoordinator';
import { BossEncounter } from './BossEncounter';
import { Actor } from '../entities/Actor';
import { InputController, type InputSource } from '../input/InputController';
import { CombatSystem } from '../combat/CombatSystem';
import { ENEMIES, SKILLS, DASH, experienceForLevel } from '../config/balance';
import type { WorldView } from '../world/WorldView';
import { Effects } from '../view/Effects';
import { DebugView } from '../view/DebugView';
import { LootSystem } from './LootSystem';

type Notify=(message:string,kind?:'info'|'success'|'danger')=>void;
/** Integration boundary: owns one run, clocks, actors and systems; Scene just wires lifecycle. */
export class GameSession {
  readonly state:GameState;
  readonly player:Player;
  readonly enemies:Enemy[];
  readonly combat:CombatSystem;
  readonly loot:LootSystem;
  readonly input:InputSource;
  readonly effects:Effects;
  readonly encounter?:BossEncounter;
  readonly coordinator=new EnemyCoordinator();
  private bossPhase=1;
  deaths=0;
  private readonly debugView:DebugView;
  paused=false;
  debug=false;
  now=0;
  private respawnAt=0;
  private hitStopRemaining=0;
  private checkpointHint=false;
  private exitHintAt=0;
  private readonly rewarded=new Set<string>();
  private readonly onBlur=()=>this.setPaused(true);

  constructor(private scene:Phaser.Scene,readonly map:MapDefinition,private world:WorldView,private notify:Notify) {
    this.state=new GameState(map.spawn);this.state.totalEnemies=map.enemies.length;
    this.player=new Player(scene,this.state,map.spawn);
    this.enemies=map.enemies.map(spawn=>spawn.type==='boss'||spawn.type==='elite'?new Boss(scene,spawn,ENEMIES[spawn.type]):new Enemy(scene,spawn,ENEMIES[spawn.type]));
    scene.physics.add.collider(this.player.sprite,world.platforms);
    this.enemies.forEach(enemy=>scene.physics.add.collider(enemy.sprite,world.platforms));
    this.input=new InputController(scene);
    this.effects=new Effects(scene);
    this.debugView=new DebugView(scene,this.enemies);
    this.loot=new LootSystem(scene,this.state,(x,y,message)=>this.effects.floatText(x,y-20,message));
    this.combat=new CombatSystem({
      onSwing:attack=>this.effects.swing(attack),
      onHit:(target,damage,attack)=>{
        this.effects.damage(target,damage,attack);this.hitStopRemaining=42;
        if(target instanceof Enemy&&target.staggeredAt===this.now) {this.effects.poiseBreak(target);this.hitStopRemaining=65;}
      },
      onKill:target=>this.onKill(target),
    },{terrain:map.platforms,worldWidth:map.width,obstacles:()=>this.encounter?.obstacles??[]});
    const boss=this.enemies.find((enemy):enemy is Boss=>enemy instanceof Boss);
    if(map.bossArena&&boss)this.encounter=new BossEncounter(scene,map.bossArena,boss,this.player,world,()=>{
      this.effects.encounter(boss);this.notify('镇关鬼将 · 玄骸 — 观察前摇，闪避后反击','danger');
    });
    window.addEventListener('blur',this.onBlur);
    this.notify('循着残灯，穿过古道。小心断桥。','info');
  }
  update(delta:number):void {
    // Do not consume input edges during hit-stop: dispatch them on the next simulation frame.
    if(!this.paused&&!this.state.completed&&this.hitStopRemaining>0) {
      this.hitStopRemaining-=delta;
      this.scene.physics.world.pause();
      if(this.hitStopRemaining<=0)this.scene.physics.world.resume();
      this.draw();return;
    }
    const input=this.input.sample();
    if(input.debug)this.debug=!this.debug;
    if(input.pause&&!this.state.completed)this.setPaused(!this.paused);
    if(this.paused||this.state.completed) {this.draw();return;}
    const dt=Math.min(delta,40);
    this.now+=dt;this.state.elapsed+=dt;
    if(input.potion&&this.player.alive) {
      if(this.state.usePotion()) {this.effects.floatText(this.player.x,this.player.y-60,'回春','#a8dec0',24);this.notify('服用回春散 · 生命恢复','success');}
      else this.notify(this.state.stats.potionCount<=0?'回春散已用尽。寻找残灯补给。':'生命已满，无需使用回春散。');
    }
    this.player.update(input,this.now,this.combat);
    this.encounter?.update(this.now);
    this.coordinator.update(this.now,this.player,this.enemies);
    this.enemies.forEach(enemy=>enemy.update(this.now,this.player,this.combat,this.coordinator.forEnemy(enemy)));
    if(this.encounter&&this.encounter.boss.controller.phase!==this.bossPhase) {
      this.bossPhase=this.encounter.boss.controller.phase;
      this.effects.phaseChange(this.encounter.boss,this.bossPhase);
    }
    for(let i=this.enemies.length-1;i>=0;i--) {
      const enemy=this.enemies[i];
      if(!enemy.alive&&enemy.sprite.alpha<=0) {this.enemies.splice(i,1);enemy.destroy();}
    }
    this.combat.update(dt,this.now,[this.player,...this.enemies]);
    this.loot.update(this.now,this.player);
    this.updateProgress();
    this.world.update(this.now,this.player.x);
    this.draw();
  }
  private draw():void {
    this.effects.update(this.now,this.enemies,this.combat.attacks,this.player);
    this.debugView.update(this.debug,this.player,this.enemies,this.combat.attacks);
  }
  private updateProgress():void {
    if(this.player.alive&&this.player.body.bottom>830) {
      this.state.takeDamage(this.state.stats.maxHp);
      this.player.die();this.combat.cancel(this.player);
    }
    if(!this.player.alive) {
      if(this.respawnAt===0) {
        this.deaths++;this.combat.clear();this.encounter?.reset(this.now);this.bossPhase=1;
        this.respawnAt=this.now+1450;this.notify('灯火未熄 · 即将返回最近的残灯','danger');}
      if(this.now>=this.respawnAt) {
        this.combat.clear();this.enemies.forEach(enemy=>{if(!(enemy instanceof Boss))enemy.resetPosition();});
        this.player.respawn(this.state.checkpoint,this.now);this.respawnAt=0;
        this.scene.cameras.main.stopFollow();
        this.scene.cameras.main.pan(Math.max(640,Math.min(this.map.width-640,this.player.x)),360,500,'Sine.easeInOut');
        this.scene.time.delayedCall(520,()=>this.scene.cameras.main.startFollow(this.player.sprite,true,0.08,0, -180,0));
        this.notify('重燃 · 已恢复生命','success');
      }
      return;
    }
    if(!this.state.visitedCheckpoints.has('mid')&&!this.state.visitedCheckpoints.has('boss')&&Math.abs(this.player.x-this.map.checkpoint.x)<75&&Math.abs(this.player.centerY-this.map.checkpoint.y)<100) {
      this.state.activateCheckpoint(this.map.checkpoint);
      this.world.setCheckpointActive(true);
      this.effects.floatText(this.player.x,this.player.y-80,'残灯重燃','#e9c38a',30);
      this.notify('残灯已点亮 · 生命恢复 · 回春散补足 · 重生点已记录','success');
    }
    if(this.player.x>this.map.checkpoint.x-380&&!this.checkpointHint) {this.checkpointHint=true;this.notify('前方残灯可恢复生命，补充药品并记录重生位置。');}
    const eliteDefeated=this.encounter?.state==='defeated';
    const bossCheckpoint=this.map.bossArena?.checkpoint;
    if(bossCheckpoint&&!this.state.visitedCheckpoints.has('boss')&&Math.abs(this.player.x-bossCheckpoint.x)<80&&Math.abs(this.player.centerY-bossCheckpoint.y)<100) {
      this.state.activateCheckpoint(bossCheckpoint,'boss');this.world.setBossCheckpointActive(true);
      this.effects.floatText(this.player.x,this.player.y-80,'关前残灯 · 已记录','#e9c38a',26);
      this.notify('关前残灯已燃 · 重试玄骸时恢复生命与三份回春散','success');
    }
    this.world.setExitOpen(eliteDefeated);
    if(Math.abs(this.player.x-this.map.exit.x)<75) {
      if(eliteDefeated) {
        this.state.completed=true;this.player.body.stop();this.combat.clear();this.scene.physics.world.pause();
        this.notify('古道已明 · 试炼完成','success');
      } else if(this.now>this.exitHintAt) {this.exitHintAt=this.now+4000;this.notify('封印未解。击败镇关鬼将，再穿过山门。','danger');}
    }
    for(const enemy of this.enemies) {
      if(enemy.alive&&enemy.body.bottom>830) {
        enemy.receiveDamage(enemy.maxHp,1,this.now+10000,0);this.onKill(enemy);
      }
    }
  }
  private onKill(target:Actor):void {
    if(!(target instanceof Enemy)||this.rewarded.has(target.id))return;
    this.rewarded.add(target.id);this.combat.cancel(target);
    const levels=this.state.grantKill(target.config);
    this.loot.drop(target.config,target.x,Math.min(target.body.bottom-20,575));
    this.effects.floatText(target.x,target.y-65,`+${target.config.experience} 修为`,'#add4ba',17);
    if(levels>0) {this.effects.floatText(this.player.x,this.player.y-95,`境界提升 · ${this.state.stats.level}`,'#f5d292',30);this.notify(`境界提升至 ${this.state.stats.level} · 生命与攻击增强`,'success');}
    if(target instanceof Boss) {
      this.encounter?.defeat(this.now);
      this.scene.events.emit('boss-drop',{bossId:target.id,x:target.x,y:target.y,level:this.state.stats.level});
      this.notify('镇关鬼将已败 · 结界解除 · 向右抵达山门','success');
    }
  }
  setPaused(paused:boolean):void {
    if(this.state.completed)return;
    this.paused=paused;
    this.input.reset();
    if(paused) {
      this.scene.physics.world.pause();this.scene.tweens.pauseAll();this.scene.time.paused=true;
      [this.player,...this.enemies].forEach(actor=>actor.sprite.anims.pause());
    } else {
      this.scene.physics.world.resume();this.scene.tweens.resumeAll();this.scene.time.paused=false;
      [this.player,...this.enemies].forEach(actor=>actor.sprite.anims.resume());
    }
  }
  snapshot():HudSnapshot {
    const s=this.state.stats;
    const zone=[...this.map.zones].reverse().find(z=>this.player.x>=z.x)??this.map.zones[0];
    const eliteDefeated=this.encounter?.state==='defeated';
    return {...s,experienceToNext:experienceForLevel(s.level),skillCooldown:Math.max(0,this.player.skillReadyAt-this.now),skillCooldownMax:SKILLS.swordWave.cooldown,dashCooldown:Math.max(0,this.player.dash.readyAt-this.now),dashCooldownMax:DASH.cooldown,location:zone.name,objective:eliteDefeated?'穿过山门 · 完成试炼':this.state.checkpointActive?'击败镇关鬼将，抵达山门':'沿古道前行，点亮残灯',progress:Math.max(0,Math.min(1,this.player.x/this.map.width)),kills:this.state.kills,totalEnemies:this.state.totalEnemies,elapsed:this.state.elapsed,checkpointActive:this.state.checkpointActive,state:this.player.state,fps:Math.round(this.scene.game.loop.actualFps),debug:this.debug,paused:this.paused,dead:!this.player.alive,completed:this.state.completed,boss:this.encounter?.snapshot(),bossCheckpointActive:this.state.visitedCheckpoints.has('boss')};
  }
  destroy():void {
    window.removeEventListener('blur',this.onBlur);
    this.scene.time.paused=false;this.scene.tweens.resumeAll();
    this.encounter?.destroy();this.input.destroy();this.loot.destroy();this.effects.destroy();this.debugView.destroy();
    this.combat.clear();this.player.destroy();this.enemies.forEach(enemy=>enemy.destroy());
  }
}
