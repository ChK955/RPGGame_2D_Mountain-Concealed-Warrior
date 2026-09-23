import Phaser from 'phaser';
import type { EnemyConfig } from '../data/types';
import type { GameState } from '../data/GameState';
import type { Player } from '../entities/Player';
import { rollLoot } from './lootRules';

interface LootItem { id:number; kind:'gold'|'potion';amount:number;x:number;y:number;view:Phaser.GameObjects.Container }
export class LootSystem {
  readonly items:LootItem[]=[];
  private nextId=0;
  constructor(private scene:Phaser.Scene,private state:GameState,private onPickup:(x:number,y:number,message:string)=>void) {}
  drop(config:EnemyConfig,x:number,y:number):void {
    const rewards=rollLoot(config);
    rewards.forEach((reward,index)=>this.spawn(reward.kind,reward.amount,x+index*28-14,y));
  }
  spawn(kind:'gold'|'potion',amount:number,x:number,y:number):void {
    const color=kind==='gold'?0xe1bd74:0xc26d57;
    const g=this.scene.add.graphics();
    g.fillStyle(color,0.1).fillCircle(0,0,21);
    if(kind==='gold') { g.fillStyle(color).fillCircle(0,0,7);g.lineStyle(2,0x6a542e).strokeCircle(0,0,3); }
    else {g.fillStyle(0xd4d2ba).fillRect(-3,-12,6,4);g.fillStyle(color).fillRoundedRect(-6,-7,12,15,3);g.fillStyle(0xf0cab3,0.8).fillRect(-3,-5,2,7);}
    const view=this.scene.add.container(x,y,[g]).setDepth(22);
    this.items.push({id:this.nextId++,kind,amount,x,y,view});
  }
  update(now:number,player:Player):void {
    for(let i=this.items.length-1;i>=0;i--) {
      const item=this.items[i];
      item.view.y=item.y+Math.sin(now/280+item.id)*5;
      if(player.alive && Math.abs(player.x-item.x)<55 && Math.abs(player.centerY-item.y)<85) {
        this.state.addLoot(item.kind,item.amount);
        this.onPickup(item.x,item.y, item.kind==='gold'?`+${item.amount} 铜钱`:`+${item.amount} 回春散`);
        item.view.destroy();this.items.splice(i,1);
      }
    }
  }
  destroy():void { this.items.forEach(item=>item.view.destroy());this.items.length=0; }
}
