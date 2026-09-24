import type Phaser from 'phaser';
import type { GameplayScene } from '../scenes/GameplayScene';
import type { VillageScene } from '../scenes/VillageScene';
/** Local dev-only inspection. This module is tree-shaken out of production. */
export function installDevtools(game:Phaser.Game):void {
  const inspect=()=>{
    const scene=game.scene.getScene('Gameplay') as GameplayScene;
    if(!scene.scene.isActive()) {
      const village=game.scene.getScene('Village') as VillageScene;
      return village.scene.isActive()?village.inspect():null;
    }
    const s=scene?.session;
    if(!s)return null;
    return { scene:'Gameplay',levelId:s.map.id,...s.snapshot(),world:s.state.world,returnPortalReadyAt:s.returnPortalReadyAt,hazards:s.hazards?.snapshot()??[],now:s.now,deaths:s.deaths,encounter:s.encounter?{state:s.encounter.state,startedAt:s.encounter.startedAt,attempts:s.encounter.attempts,lastDuration:s.encounter.lastDuration,arena:s.encounter.arena}:null,player:{x:s.player.x,y:s.player.y,vx:s.player.body.velocity.x,vy:s.player.body.velocity.y,grounded:s.player.grounded,body:s.player.bounds,animation:s.player.sprite.anims.currentAnim?.key,facing:s.player.facing},enemies:s.enemies.map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp,state:e.state,elite:e.config.elite,archetype:e.config.archetype,poise:e.poise.current,maxPoise:e.poise.max,alerted:e.alerted,cue:e.combatCue,attackStage:e.attackStage,facing:e.facing,body:e.bounds,animation:e.sprite.anims.currentAnim?.key})),attacks:s.combat.attacks.map(a=>({id:a.id,source:a.source.id,active:a.window.active,projectile:a.projectile,kind:a.kind,facing:a.facing,age:a.window.age,bounds:a.bounds})),loot:s.loot.items.map(i=>({kind:i.kind,x:i.x,y:i.y})),checkpoint:s.state.checkpoint};
  };
  Object.assign(window,{__MISTBOUND__:{game,inspect,getSession:()=>(game.scene.getScene('Gameplay') as GameplayScene).session,getState:()=>game.registry.get('gameState')}});
}
