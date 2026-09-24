import type Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import type { AttackInstance } from '../combat/CombatSystem';
import type { FallingRockSnapshot } from '../systems/FallingRockHazard';

export class DebugView {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly labels = new Map<string, Phaser.GameObjects.Text>();
  private readonly attackLabels: Phaser.GameObjects.Text[] = [];
  constructor(private readonly scene: Phaser.Scene, _enemies: Enemy[]) {
    this.graphics = scene.add.graphics().setDepth(90);
  }
  update(enabled: boolean, player: Player, enemies: Enemy[], attacks: AttackInstance[], hazards:readonly FallingRockSnapshot[]=[]): void {
    const g = this.graphics; g.clear();
    this.labels.forEach(label => label.setVisible(false));
    this.attackLabels.forEach(label => label.setVisible(false));
    if (!enabled) return;
    g.lineStyle(2, 0x65eec4).strokeRect(player.body.x, player.body.y, player.body.width, player.body.height);
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      let label = this.labels.get(enemy.id);
      if (!label) { label = this.makeLabel(); this.labels.set(enemy.id, label); }
      const controller = (enemy as Enemy & { controller?: { phase: number; currentSkill: string; transitioning: boolean } }).controller;
      const text = [
        `${enemy.id} / ${enemy.config.archetype} / ${enemy.state}`,
        `HP ${Math.ceil(enemy.hp)}/${enemy.maxHp} · POISE ${Math.ceil(enemy.poise.current)}/${enemy.poise.max} · ALERT ${enemy.alerted ? 'ON' : 'OFF'}`,
        `${enemy.attackStage.toUpperCase()}${enemy.combatCue ? ` · ${enemy.combatCue.kind} ${(enemy.combatCue.progress * 100).toFixed(0)}% →${enemy.combatCue.direction}` : ''}`,
      ];
      if (controller) text.push(`PHASE ${controller.phase} · ${controller.currentSkill || 'idle'}${controller.transitioning ? ' · TRANSITION' : ''}`);
      label.setVisible(true).setPosition(enemy.x - 80, Math.max(120, enemy.body.y - (controller ? 128 : 111))).setText(text);
      g.lineStyle(1, 0xebb665, 0.2).strokeCircle(enemy.x, enemy.centerY, enemy.config.detectionRange);
      g.lineStyle(1, 0xff7777, 0.6).strokeCircle(enemy.x, enemy.centerY, enemy.config.attackRange);
      g.lineStyle(1, 0xffba8c).strokeRect(enemy.body.x, enemy.body.y, enemy.body.width, enemy.body.height);
    }
    attacks.forEach((attack, i) => {
      const r = attack.bounds;
      const color = attack.kind === 'shockwave' ? 0xffa466 : attack.projectile ? 0xca9dfa : 0xfff176;
      g.lineStyle(2, attack.window.active ? color : 0x726247, 0.9).strokeRect(r.x, r.y, r.width, r.height);
      if (attack.window.active) g.fillStyle(color, 0.13).fillRect(r.x, r.y, r.width, r.height);
      let label = this.attackLabels[i];
      if (!label) { label = this.makeLabel().setFontSize(10); this.attackLabels.push(label); }
      label.setVisible(true).setPosition(r.x, r.y + r.height + 3).setText(`${attack.kind} / ${attack.window.active ? 'ACTIVE' : attack.window.finished ? 'END' : 'WINDUP'}`);
    });
    hazards.forEach(hazard=>{
      if(hazard.state==='idle'||hazard.state==='cooldown')return;
      const box=hazard.bounds;
      g.lineStyle(2,hazard.state==='impact'?0xff735d:0xf3be75,0.95).strokeRect(box.x,box.y,box.width,box.height);
      if(hazard.state==='impact')g.fillStyle(0xff735d,0.12).fillRect(box.x,box.y,box.width,box.height);
    });
  }
  destroy(): void {
    this.graphics.destroy(); this.labels.forEach(label => label.destroy()); this.attackLabels.forEach(label => label.destroy());
    this.labels.clear(); this.attackLabels.length = 0;
  }
  private makeLabel(): Phaser.GameObjects.Text {
    return this.scene.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '11px', color: '#efffc2', backgroundColor: '#132625dd', padding: { x: 4, y: 3 }, lineSpacing: 2 }).setDepth(91).setVisible(false);
  }
}
