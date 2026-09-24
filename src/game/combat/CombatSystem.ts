import type { Actor } from '../entities/Actor';
import type { AttackKind, Facing, Point, SkillConfig } from '../data/types';
import { AttackWindow, intersects, type Rect } from './AttackWindow';

export interface MeleeSpec {
  windup:number; active:number; recovery:number; range:number; height:number;
  damage:number; knockback:number; poiseDamage?:number; kind?:AttackKind;
  facing?:Facing; offsetX?:number; offsetY?:number;
}
export interface ProjectileSpec {
  windup:number; lifetime:number; damage:number; width:number; height:number; speed:number;
  speedY?:number; poiseDamage?:number; knockback?:number; facing?:Facing; offsetY?:number; origin?:Point;
  kind?:'wave'|'bolt'|'shockwave'|'rock'|'roar'; piercing?:boolean; grounded?:boolean;
}
export interface AttackInstance {
  id:number; source:Actor; facing:Facing; window:AttackWindow; bounds:Rect;
  damage:number; poiseDamage:number; knockback:number; range:number; height:number;
  offsetX:number; offsetY:number; projectile:boolean; speed:number; speedY:number; shown:boolean;
  kind:AttackKind; grounded:boolean; piercing:boolean; origin?:Point;
  createdAt:number|null; lastUpdatedAt:number; consumed:boolean;
}
export interface CombatFeedback {
  onHit(target:Actor,damage:number,attack:AttackInstance):void;
  onSwing(attack:AttackInstance):void;
  onKill(target:Actor):void;
}
interface CombatWorld { terrain?:Rect[]; worldWidth?:number; obstacles?:()=>Rect[] }

/** Shared attack objects for players, enemies and bosses. Only active windows deal damage. */
export class CombatSystem {
  attacks:AttackInstance[]=[];
  private nextId=1;
  constructor(private feedback:CombatFeedback,private world:CombatWorld={}) {}

  melee(source:Actor,spec:MeleeSpec):AttackInstance {
    const attack:AttackInstance={
      id:this.nextId++,source,facing:spec.facing??source.facing,
      window:new AttackWindow(spec.windup,spec.active,spec.recovery),
      bounds:{x:0,y:0,width:spec.range,height:spec.height},damage:spec.damage,
      poiseDamage:spec.poiseDamage??0,knockback:spec.knockback,range:spec.range,height:spec.height,
      offsetX:spec.offsetX??10,offsetY:spec.offsetY??0,projectile:false,speed:0,speedY:0,shown:false,
      kind:spec.kind??'slash',grounded:false,piercing:true,createdAt:null,lastUpdatedAt:0,consumed:false,
    };
    this.anchor(attack);this.attacks.push(attack);return attack;
  }

  projectile(source:Actor,skill:SkillConfig,damage:number):AttackInstance {
    return this.launchProjectile(source,{...skill,damage,kind:'wave',knockback:230,piercing:true});
  }

  launchProjectile(source:Actor,spec:ProjectileSpec):AttackInstance {
    const attack:AttackInstance={
      id:this.nextId++,source,facing:spec.facing??source.facing,
      window:new AttackWindow(spec.windup,spec.lifetime,0),
      bounds:{x:0,y:0,width:spec.width,height:spec.height},damage:spec.damage,
      poiseDamage:spec.poiseDamage??0,knockback:spec.knockback??130,range:spec.width,height:spec.height,
      offsetX:12,offsetY:spec.offsetY??0,projectile:true,speed:spec.speed,speedY:spec.speedY??0,shown:false,
      kind:spec.kind??'bolt',grounded:spec.grounded??false,piercing:spec.piercing??false,
      origin:spec.origin?{...spec.origin}:undefined,createdAt:null,lastUpdatedAt:0,consumed:false,
    };
    this.anchor(attack);this.attacks.push(attack);return attack;
  }

  update(_delta:number,now:number,targets:Actor[]):void {
    // Mutating cancel() in a kill callback must not invalidate this frame's iteration.
    for(const attack of [...this.attacks]) {
      if(!this.attacks.includes(attack))continue;
      if(!attack.source.alive || (attack.source.interrupted && !(attack.projectile&&attack.shown))) {
        attack.consumed=true;continue;
      }
      if(attack.createdAt===null) {attack.createdAt=now;attack.lastUpdatedAt=now;}
      attack.window.age=Math.max(0,now-attack.createdAt);
      if(attack.window.finished)continue;
      if(!attack.projectile||!attack.shown)this.anchor(attack);
      if(!attack.window.active) {attack.lastUpdatedAt=now;continue;}
      if(!attack.shown) {attack.shown=true;this.feedback.onSwing(attack);}
      if(attack.projectile) {
        const activeSince=attack.createdAt+attack.window.windup;
        const delta=Math.max(0,now-Math.max(activeSince,attack.lastUpdatedAt));
        attack.bounds.x+=attack.facing*attack.speed*delta/1000;
        attack.bounds.y+=attack.speedY*delta/1000;
        if(this.blocked(attack)) {attack.consumed=true;continue;}
      }
      attack.lastUpdatedAt=now;
      for(const target of targets) {
        if(!target.alive||target.faction===attack.source.faction||!intersects(attack.bounds,target.bounds))continue;
        if(!attack.window.tryHit(target.id))continue;
        const damage=target.receiveDamage(attack.damage,attack.facing,now,attack.knockback,attack.poiseDamage);
        if(damage<=0)continue;
        this.feedback.onHit(target,damage,attack);
        if(!target.alive)this.feedback.onKill(target);
        if(attack.projectile&&!attack.piercing) {attack.consumed=true;break;}
      }
    }
    this.attacks=this.attacks.filter(a=>!a.consumed&&!a.window.finished&&a.source.alive);
  }

  private anchor(attack:AttackInstance):void {
    const r=attack.bounds;
    const center=attack.origin??{x:attack.source.body.center.x,y:attack.source.centerY+attack.offsetY};
    r.x=attack.origin?center.x-r.width/2:center.x+(attack.facing>0?attack.offsetX:-r.width-attack.offsetX);
    r.y=attack.grounded?attack.source.body.bottom-r.height:center.y-r.height/2;
  }

  private blocked(attack:AttackInstance):boolean {
    const r=attack.bounds;
    if(r.x+r.width<0||r.x>(this.world.worldWidth??Number.POSITIVE_INFINITY))return true;
    const terrain=this.world.terrain??[];
    if(attack.grounded) {
      const middle=r.x+r.width/2;
      const ground=terrain.find(p=>middle>=p.x&&middle<=p.x+p.width&&Math.abs(p.y-(r.y+r.height))<24);
      if(terrain.length&&!ground)return true;
      if(ground)r.y=ground.y-r.height;
    }
    return [...terrain,...(this.world.obstacles?.()??[])].some(p=>intersects(r,p));
  }

  cancel(source:Actor,includeLaunched=true):void {
    this.attacks=this.attacks.filter(a=>a.source!==source||(!includeLaunched&&a.projectile&&a.shown));
  }
  clear():void {this.attacks=[];}
}
