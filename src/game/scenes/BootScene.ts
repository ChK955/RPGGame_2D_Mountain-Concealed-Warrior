import Phaser from 'phaser';
import { preloadAssets } from '../assets/manifest';
import { registerAnimations } from '../animations/animationConfig';
export class BootScene extends Phaser.Scene {
  constructor() {super('Boot');}
  preload():void {
    preloadAssets(this);
    const label=this.add.text(640,340,'山雾渐起 · 正在入境',{fontFamily:'Georgia, "Songti SC", serif',fontSize:'24px',color:'#c9ceae'}).setOrigin(0.5);
    this.load.on('progress',(value:number)=>label.setText(`山雾渐起 · ${Math.round(value*100)}%`));
  }
  create():void {registerAnimations(this);this.scene.start('Gameplay');}
}
