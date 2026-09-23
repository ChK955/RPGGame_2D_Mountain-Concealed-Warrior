import Phaser from 'phaser';
import { GameSession } from '../systems/GameSession';
import { DEMO_MAP } from '../world/map';
import { WorldView } from '../world/WorldView';
import { Hud } from '../../ui/Hud';

export class GameplayScene extends Phaser.Scene {
  session!:GameSession;
  private hud!:Hud;
  private worldView!:WorldView;
  constructor(){super('Gameplay');}
  create():void {
    this.physics.world.setBounds(0,0,DEMO_MAP.width,DEMO_MAP.height);
    this.physics.world.resume();
    this.time.paused=false;
    this.worldView=new WorldView(this,DEMO_MAP);
    this.hud=new Hud(document.querySelector<HTMLElement>('#hud-root')!,{
      onPause:()=>this.session.setPaused(true),onResume:()=>this.session.setPaused(false),
      onRestart:()=>{this.session.setPaused(false);this.scene.restart();},
    });
    this.session=new GameSession(this,DEMO_MAP,this.worldView,(message,kind)=>this.hud.notify(message,kind));
    const camera=this.cameras.main;
    camera.setBounds(0,0,DEMO_MAP.width,720);
    camera.startFollow(this.session.player.sprite,true,0.08,0,-180,0);
    camera.setScroll(0,0);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.hud.destroy();this.session.destroy();this.worldView.destroy();});
  }
  update(_time:number,delta:number):void {this.session.update(delta);this.hud.update(this.session.snapshot());}
}
