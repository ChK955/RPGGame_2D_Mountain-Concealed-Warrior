import Phaser from 'phaser';
import type { Actor } from '../entities/Actor';
import type { Enemy } from '../entities/Enemy';
import type { AttackInstance } from '../combat/CombatSystem';
import type { TelegraphCue } from '../data/types';

const COLORS = { slash: 0xeab487, lunge: 0x9bddce, heavy: 0xe9b762, bolt: 0xd3acd7, wave: 0xb5e9cb, shockwave: 0xeead6f, combo: 0xed9b85, phantom: 0xc1a2ed, smash: 0xe5a373, rock: 0xc4ac8c, roar: 0xe3a0a4, transition: 0xead5b0 };

/** Paints published combat state. No timers here can activate or interrupt an attack. */
export class Effects {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly labels = new Map<string, Phaser.GameObjects.Text>();
  private readonly lastCue = new Map<string, string>();
  private lastTrail = 0;
  constructor(private readonly scene: Phaser.Scene) { this.graphics = scene.add.graphics().setDepth(25); }
  private get reducedMotion(): boolean { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  damage(actor: Actor, amount: number, attack?: AttackInstance): void {
    this.floatText(actor.x, actor.centerY - 46, String(amount), actor.faction === 'player' ? '#ff9685' : '#fff0c8', 25);
    for (let i = 0; i < (this.reducedMotion ? 3 : 7); i++) {
      const p = this.scene.add.circle(actor.x, actor.centerY, 2 + i % 2, actor.faction === 'player' ? 0xcf7268 : 0xbdd9bc).setDepth(28);
      this.scene.tweens.add({ targets: p, x: actor.x + (Math.random() - 0.5) * 100, y: actor.centerY - 20 - Math.random() * 60, alpha: 0, duration: 230 + Math.random() * 170, onComplete: () => p.destroy() });
    }
    const heavy = attack && ['heavy', 'shockwave', 'phantom', 'smash', 'roar', 'rock'].includes(attack.kind);
    if (!this.reducedMotion && actor.faction === 'player') this.scene.cameras.main.shake(heavy ? 120 : 65, heavy ? 0.0023 : 0.0011);
    this.audio(heavy ? 'heavy-hit' : 'hit', actor.x);
  }

  poiseBreak(actor: Actor): void {
    this.floatText(actor.x, actor.body.y - 35, '破势', '#e6edbf', 19);
    const g = this.scene.add.graphics().setDepth(29);
    g.lineStyle(2, 0xe2edb1, 0.9).strokeEllipse(actor.x, actor.body.bottom - 3, actor.body.width + 42, 24);
    for (const side of [-1, 1]) g.lineBetween(actor.x + side * 10, actor.centerY - 22, actor.x + side * 37, actor.centerY - 42);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 430, onComplete: () => g.destroy() });
    if (!this.reducedMotion) this.scene.cameras.main.shake(95, 0.0016);
    this.audio('poise-break', actor.x);
  }

  phaseChange(actor: Actor, phase: number): void {
    const ape = (actor as Actor & { config?: { archetype?: string } }).config?.archetype === 'ape-boss';
    this.floatText(actor.x, actor.body.y - 62, ape ? '赤目狂化' : phase === 3 ? '鬼影燃魂' : '玄甲苏醒', phase === 3 ? '#e1a6bc' : '#ebcc9b', 23);
    const g = this.scene.add.graphics().setDepth(27);
    g.lineStyle(3, phase === 3 ? 0xca90be : 0xe2c08a, 0.9).strokeEllipse(actor.x, actor.body.bottom, 240, 45);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 850, onComplete: () => g.destroy() });
    if (!this.reducedMotion) {
      this.scene.cameras.main.shake(220, 0.0023);
      this.scene.cameras.main.flash(180, 80, 62, 39, false);
    }
    this.audio('phase-change', actor.x);
  }

  encounter(actor: Actor): void {
    if (!this.reducedMotion) this.scene.cameras.main.shake(160, 0.0015);
    this.audio('encounter', actor.x);
  }

  floatText(x: number, y: number, text: string, color = '#dec18a', size = 19): void {
    const label = this.scene.add.text(x, y, text, { fontFamily: 'Georgia, "Songti SC", serif', fontSize: `${size}px`, color, stroke: '#152629', strokeThickness: 3 }).setOrigin(0.5).setDepth(40);
    this.scene.tweens.add({ targets: label, y: y - (this.reducedMotion ? 25 : 58), alpha: 0, duration: 950, ease: 'Cubic.Out', onComplete: () => label.destroy() });
  }

  swing(attack: AttackInstance): void {
    this.audio(attack.kind, attack.source.x);
    if (attack.projectile) return;
    // The slash follows its rectangular damage footprint, including each actor's scale.
    const g = this.scene.add.graphics().setDepth(26);
    const r = attack.bounds, tip = attack.facing > 0 ? r.x + r.width : r.x;
    const base = attack.facing > 0 ? r.x : r.x + r.width;
    const color = attack.source.faction === 'player' ? COLORS.wave : COLORS[attack.kind];
    g.fillStyle(color, 0.13).fillTriangle(base, r.y + r.height / 2, tip, r.y, tip, r.y + r.height);
    g.lineStyle(3, color, 0.9).lineBetween(base, r.y + r.height * 0.82, tip, r.y + r.height * 0.2);
    g.lineStyle(7, color, 0.18).lineBetween(base, r.y + r.height * 0.82, tip, r.y + r.height * 0.2);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 175, onComplete: () => g.destroy() });
  }

  update(now: number, enemies: Enemy[], attacks: AttackInstance[], player: Actor): void {
    const g = this.graphics; g.clear();
    this.labels.forEach(label => label.setVisible(false));
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const boss = enemy.config.archetype === 'boss' || enemy.config.archetype === 'ape-boss';
      const x = enemy.body.center.x, y = enemy.body.y - 15, width = boss ? 94 : 52;
      if (!boss && (enemy.hp < enemy.maxHp || enemy.alerted)) {
        g.fillStyle(0x0b181b, 0.9).fillRect(x - width / 2 - 2, y - 2, width + 4, 12);
        g.fillStyle(enemy.config.tint, 0.9).fillRect(x - width / 2, y, width * enemy.hp / enemy.maxHp, 3);
        g.fillStyle(0xb6d3bf, 0.6).fillRect(x - width / 2, y + 6, width * enemy.poise.current / enemy.poise.max, 2);
      }
      if (enemy.state === 'Stagger') {
        g.lineStyle(2, 0xdbe8b3, 0.75).strokeEllipse(x, enemy.body.bottom + 1, enemy.body.width + 24, 13);
        continue;
      }
      const cue = enemy.combatCue;
      if (!cue) { this.lastCue.delete(enemy.id); continue; }
      this.drawCue(enemy, cue);
      if (cue.phase === 'windup') {
        const key = `${cue.kind}:${enemy.attackStartedAt}`;
        if (this.lastCue.get(enemy.id) !== key) { this.audio(`telegraph-${cue.kind}`, x); this.lastCue.set(enemy.id, key); }
      } else this.lastCue.delete(enemy.id);
      let label = this.labels.get(enemy.id);
      if (!label) {
        label = this.scene.add.text(0, 0, '', { fontFamily: '"PingFang SC", sans-serif', fontSize: boss ? '15px' : '12px', stroke: '#08191d', strokeThickness: 4, color: '#efce9f' }).setOrigin(0.5).setDepth(32);
        this.labels.set(enemy.id, label);
      }
      label.setVisible(true).setPosition(x, enemy.body.y - (boss ? 26 : 34));
      label.setText(cue.phase === 'recovery' ? '破绽' : cue.label);
      label.setColor(cue.phase === 'recovery' ? '#a7d1be' : `#${COLORS[cue.kind].toString(16).padStart(6, '0')}`);
      label.setAlpha(cue.phase === 'recovery' ? 0.65 : 1);
    }
    for (const attack of attacks) {
      if (!attack.window.active) continue;
      if (attack.projectile) this.drawProjectile(attack);
      else if (attack.source.faction === 'enemy') {
        const r = attack.bounds;
        g.fillStyle(COLORS[attack.kind], 0.09).fillRect(r.x, r.y, r.width, r.height);
        g.lineStyle(2, COLORS[attack.kind], 0.7).lineBetween(r.x, r.y + r.height, r.x + r.width, r.y + r.height);
      }
    }
    if (player.state === 'Dash' && now - this.lastTrail > (this.reducedMotion ? 100 : 42)) {
      this.lastTrail = now;
      const trail = this.scene.add.image(player.x, player.y, player.sprite.texture.key, player.sprite.frame.name).setScale(player.sprite.scaleX, player.sprite.scaleY).setOrigin(player.sprite.originX, player.sprite.originY).setFlipX(player.sprite.flipX).setTint(0x83bdba).setAlpha(0.35).setDepth(18);
      this.scene.tweens.add({ targets: trail, alpha: 0, duration: 230, onComplete: () => trail.destroy() });
    }
  }

  destroy(): void { this.graphics.destroy(); this.labels.forEach(label => label.destroy()); this.labels.clear(); this.lastCue.clear(); }

  private drawCue(enemy: Enemy, cue: TelegraphCue): void {
    const g = this.graphics, x = enemy.body.center.x, ground = enemy.body.bottom + 1;
    const color = COLORS[cue.kind], progress = Phaser.Math.Clamp(cue.progress, 0, 1);
    if (cue.phase === 'recovery') {
      g.lineStyle(1, 0x9fcab5, 0.35).strokeEllipse(x, ground, enemy.body.width + 22, 10);
      return;
    }
    if (cue.kind === 'transition') {
      g.lineStyle(2, color, 0.55).strokeEllipse(x, ground, 100 + progress * 170, 25 + progress * 25);
      g.lineStyle(1, color, 0.25).strokeEllipse(x, ground, 160 + progress * 170, 40 + progress * 25);
      return;
    }
    if (cue.phase !== 'windup') return;
    const alpha = 0.26 + progress * 0.6;
    const start = x + cue.direction * 10, end = start + cue.direction * cue.range;
    g.lineStyle(2, color, alpha).strokeEllipse(x, ground, enemy.body.width + 20, 12);
    g.lineStyle(2, color, alpha).strokeCircle(x + cue.direction * 18, enemy.centerY - 8, 3 + 5 * progress);
    if (cue.kind === 'smash') {
      const target=(enemy as Enemy & {controller?:{landingTargetX?:number|null}}).controller?.landingTargetX;
      if(target!==null&&target!==undefined) {
        g.fillStyle(color,0.08+progress*0.16).fillEllipse(target,ground-4,Math.max(150,cue.range),22);
        g.lineStyle(3,color,alpha).strokeEllipse(target,ground-4,Math.max(150,cue.range),22);
        g.lineStyle(1,color,alpha*0.55).lineBetween(x,enemy.body.y-48,target,ground-14);
      }
    } else if ((cue.kind === 'bolt' || cue.kind === 'rock') && enemy.rangedAim) {
      const aim = enemy.rangedAim;
      const fromX = enemy.body.center.x + cue.direction * 25;
      const fromY = enemy.centerY;
      g.lineStyle(1, color, alpha * 0.75).lineBetween(fromX, fromY, aim.x, aim.y);
      g.lineStyle(2, color, alpha).strokeCircle(aim.x, aim.y, 5);
    } else if (cue.kind === 'bolt'||cue.kind === 'rock') {
      const aimY = enemy.centerY;
      g.lineStyle(1, color, alpha * 0.75).lineBetween(start, aimY, end, aimY);
      g.lineStyle(2, color, alpha).lineBetween(end, aimY - 5, end, aimY + 5);
    } else if (cue.kind === 'shockwave'||cue.kind === 'roar') {
      // Both directions are announced; the moving objects below carry the real hitboxes.
      for (const side of [-1, 1]) {
        const tip = x + side * Math.min(cue.range, 300);
        g.lineStyle(2, color, alpha).lineBetween(x, ground, tip, ground);
        g.fillStyle(color, alpha).fillTriangle(tip, ground - 2, tip - side * 12, ground - 9, tip - side * 12, ground + 3);
      }
      g.lineStyle(3, color, alpha).strokeEllipse(x, ground - 4, 50 + progress * 25, 15);
    } else {
      g.fillStyle(color, 0.04 + progress * 0.12).fillRect(Math.min(start, end), ground - 5, cue.range, 7);
      g.lineStyle(2, color, alpha).lineBetween(start, ground - 1, end, ground - 1);
      if (['lunge', 'phantom'].includes(cue.kind)) {
        for (const ratio of [0.4, 0.7, 1]) {
          const tip = start + (end - start) * ratio;
          g.lineStyle(2, color, alpha).lineBetween(tip - cue.direction * 10, ground - 9, tip, ground - 2).lineBetween(tip, ground - 2, tip - cue.direction * 10, ground + 5);
        }
      } else {
        g.lineStyle(cue.kind === 'heavy' ? 4 : 2, color, alpha).lineBetween(end, ground - 9, end, ground + 3);
      }
    }
    // A filling diamond makes the final portion of the windup legible without flashing.
    g.fillStyle(color, alpha).fillTriangle(x, enemy.body.y - 8, x - 4 - progress * 3, enemy.body.y - 17, x + 4 + progress * 3, enemy.body.y - 17);
  }

  private drawProjectile(attack: AttackInstance): void {
    const g = this.graphics, r = attack.bounds, x = r.x + r.width / 2, y = r.y + r.height / 2, color = COLORS[attack.kind];
    g.fillStyle(color, 0.14).fillRoundedRect(r.x, r.y, r.width, r.height, 4);
    if (attack.kind === 'rock') {
      g.fillStyle(0x9e8471,0.96).fillCircle(x,y,Math.min(r.width,r.height)*0.44);
      g.lineStyle(2,0xe0baa0,0.8).strokeCircle(x,y,Math.min(r.width,r.height)*0.44);
      g.lineStyle(1,0x64505a,0.9).lineBetween(x-8,y-7,x+3,y+4).lineBetween(x+3,y+4,x+10,y-3);
    } else if (attack.kind === 'bolt') {
      const length = Math.hypot(attack.speed, attack.speedY) || 1;
      const ux = attack.facing * attack.speed / length, uy = attack.speedY / length;
      const tipX = x + ux * r.width * 0.5, tipY = y + uy * r.width * 0.5;
      const tailX = x - ux * r.width * 0.5, tailY = y - uy * r.width * 0.5;
      g.lineStyle(3, color, 0.9).lineBetween(tailX, tailY, tipX, tipY);
      g.fillStyle(0xf6d7ed, 1).fillTriangle(tipX, tipY,
        tipX - ux * 9 - uy * 7, tipY - uy * 9 + ux * 7,
        tipX - ux * 9 + uy * 7, tipY - uy * 9 - ux * 7);
    } else if (attack.kind === 'shockwave'||attack.kind === 'roar') {
      g.lineStyle(2, 0xf6d0a1, 0.9).lineBetween(r.x, r.y + r.height - 2, r.x + r.width, r.y + r.height - 2);
      for (let i = 0; i < 3; i++) {
        const left = r.x + r.width * i / 3;
        g.fillStyle(color, 0.75).fillTriangle(left, r.y + r.height, left + r.width / 6, r.y + (i % 2) * r.height * 0.2, left + r.width / 3, r.y + r.height);
      }
    } else {
      g.lineStyle(3, 0xe5ffcf, 0.95).lineBetween(x - attack.facing * r.width * 0.25, r.y, x + attack.facing * r.width * 0.35, y).lineBetween(x + attack.facing * r.width * 0.35, y, x - attack.facing * r.width * 0.25, r.y + r.height);
    }
  }

  private audio(kind: string, x: number): void { this.scene.events.emit('combat-audio', { kind, x }); }
}
