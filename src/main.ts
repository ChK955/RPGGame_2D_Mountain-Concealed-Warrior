import Phaser from 'phaser';
import { BootScene } from './game/scenes/BootScene';
import { GameplayScene } from './game/scenes/GameplayScene';
import { PHYSICS } from './game/config/balance';
import './ui/styles.css';

const game=new Phaser.Game({
  type:Phaser.AUTO,parent:'game-container',width:1280,height:720,backgroundColor:'#10262c',
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:1280,height:720},
  physics:{default:'arcade',arcade:{gravity:{x:0,y:PHYSICS.gravity},debug:false,tileBias:24}},
  render:{antialias:true,roundPixels:true},
  scene:[BootScene,GameplayScene],
});

if(import.meta.env.DEV) {
  import('./game/data/devtools').then(({installDevtools})=>installDevtools(game));
}
