import Phaser from 'phaser';
import { GameSession } from '../systems/GameSession';
import { getLevel, type LevelDefinition } from '../world/levels';
import { WorldView } from '../world/WorldView';
import { Hud } from '../../ui/Hud';
import { getWorldState, returnToVillage } from '../systems/WorldFlow';

/** One combat scene hosts every data-driven level; the run state lives in Registry. */
export class GameplayScene extends Phaser.Scene {
  session!:GameSession;
  private hud!:Hud;
  private worldView!:WorldView;
  private definition!:LevelDefinition;
  constructor(){super('Gameplay');}
  init(data:{levelId?:string}={}):void {this.definition=getLevel(data.levelId);}
  create():void {
    const map=this.definition.map;
    this.physics.world.setBounds(0,0,map.width,map.height);
    this.physics.world.resume();this.time.paused=false;
    this.worldView=new WorldView(this,map);
    this.hud=new Hud(document.querySelector<HTMLElement>('#hud-root')!,{
      onPause:()=>this.session.setPaused(true),onResume:()=>this.session.setPaused(false),
      onRestart:()=>{this.session.setPaused(false);this.scene.restart({levelId:this.definition.id});},
    });
    this.session=new GameSession(this,map,this.worldView,(message,kind)=>this.hud.notify(message,kind),{
      state:getWorldState(this),levelId:this.definition.id,hazards:this.definition.hazards,
      returnDelay:this.definition.returnDelay,onReturn:()=>returnToVillage(this),
    });
    const camera=this.cameras.main;
    camera.setBounds(0,0,map.width,720);
    camera.startFollow(this.session.player.sprite,true,0.08,0,-180,0);
    camera.setScroll(0,0);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.hud.destroy();this.session.destroy();this.worldView.destroy();});
  }
  update(_time:number,delta:number):void {this.session.update(delta);this.hud.update(this.session.snapshot());}
}
