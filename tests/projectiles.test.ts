import { describe, expect, it } from 'vitest';
import { CombatSystem } from '../src/game/combat/CombatSystem';
import type { Actor } from '../src/game/entities/Actor';

function actor(id:string,faction:'player'|'enemy',x:number) {
  const value={id,faction,x,y:550,centerY:560,facing:1,hp:120,state:'Idle',interrupted:false,
    get alive(){return this.hp>0;},get bounds(){return {x:this.x-13,y:526,width:26,height:70};},
    body:{center:{x,y:560},bottom:596},receiveDamage(amount:number){const actual=Math.min(this.hp,amount);this.hp-=actual;return actual;}};
  return value as unknown as Actor;
}
const feedback={onHit:()=>{},onSwing:()=>{},onKill:()=>{}};
describe('shared melee and hostile projectile rules',()=>{
  it('does not enable enemy damage before the full windup, and hits only once',()=>{
    const source=actor('enemy','enemy',100),target=actor('player','player',150);
    const combat=new CombatSystem(feedback);
    combat.melee(source,{windup:420,active:140,recovery:470,range:85,height:70,damage:18,knockback:0});
    combat.update(16,0,[source,target]);combat.update(40,400,[source,target]);expect(target.hp).toBe(120);
    combat.update(20,420,[source,target]);expect(target.hp).toBe(102);
    combat.update(40,460,[source,target]);expect(target.hp).toBe(102);
  });
  it('lets an aimed bolt hit and expire rather than living forever',()=>{
    const source=actor('ranged','enemy',100),target=actor('player','player',205);
    const combat=new CombatSystem(feedback);
    combat.launchProjectile(source,{windup:400,lifetime:1000,damage:15,width:22,height:14,speed:400,kind:'bolt',piercing:false});
    combat.update(16,0,[source,target]);combat.update(40,399,[source,target]);expect(target.hp).toBe(120);
    combat.update(1,400,[source,target]);
    for(let now=425;now<=650;now+=25)combat.update(25,now,[source,target]);
    expect(target.hp).toBe(105);expect(combat.attacks).toHaveLength(0);
    combat.launchProjectile(source,{windup:0,lifetime:100,damage:15,width:22,height:14,speed:400,kind:'bolt'});
    combat.update(0,1000,[source]);combat.update(101,1101,[source]);expect(combat.attacks).toHaveLength(0);
  });
  it('stops ground shockwaves at gaps and solid walls',()=>{
    const source=actor('boss','enemy',100);
    const combat=new CombatSystem(feedback,{terrain:[{x:0,y:596,width:180,height:100}],worldWidth:1000});
    combat.launchProjectile(source,{windup:0,lifetime:2000,damage:28,width:30,height:24,speed:400,kind:'shockwave',grounded:true});
    combat.update(0,0,[source]);
    for(let now=25;now<=300;now+=25)combat.update(25,now,[source]);
    expect(combat.attacks).toHaveLength(0);
    const wall=new CombatSystem(feedback,{terrain:[{x:0,y:596,width:1000,height:100}],obstacles:()=>[{x:200,y:0,width:12,height:596}]});
    wall.launchProjectile(source,{windup:0,lifetime:2000,damage:28,width:30,height:24,speed:400,kind:'shockwave',grounded:true});
    wall.update(0,0,[source]);
    for(let now=25;now<=300;now+=25)wall.update(25,now,[source]);
    expect(wall.attacks).toHaveLength(0);
  });
  it('freezes launched projectiles with simulation time, and clears them on source death',()=>{
    const source=actor('boss','enemy',100),combat=new CombatSystem(feedback);
    combat.launchProjectile(source,{windup:0,lifetime:2000,damage:28,width:30,height:24,speed:400,kind:'shockwave'});
    combat.update(0,0,[source]);combat.update(100,100,[source]);
    const x=combat.attacks[0].bounds.x;
    combat.update(1000,100,[source]);expect(combat.attacks[0].bounds.x).toBe(x);
    Object.assign(source,{hp:0});combat.update(16,116,[source]);expect(combat.attacks).toHaveLength(0);
  });
  it('cancels pending attacks on stagger but launched bolts have independent life',()=>{
    const source=actor('ranged','enemy',100);
    const combat=new CombatSystem(feedback);
    combat.launchProjectile(source,{windup:0,lifetime:800,damage:15,width:20,height:10,speed:400,kind:'bolt'});
    combat.update(0,0,[source]);source.state='Stagger';Object.assign(source,{interrupted:true});
    combat.update(20,20,[source]);expect(combat.attacks).toHaveLength(1);
    combat.cancel(source);expect(combat.attacks).toHaveLength(0);
    combat.melee(source,{windup:100,active:100,recovery:100,range:80,height:60,damage:15,knockback:0});
    combat.update(20,40,[source]);expect(combat.attacks).toHaveLength(0);
  });
});
