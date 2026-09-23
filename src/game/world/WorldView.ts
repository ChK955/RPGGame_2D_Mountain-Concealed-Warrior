import Phaser from 'phaser';
import type { MapDefinition, PlatformDefinition } from '../data/types';

interface Lantern { glow: Phaser.GameObjects.Image; flame: Phaser.GameObjects.Arc; phase: number }
interface Mote { view: Phaser.GameObjects.Arc; x: number; y: number; phase: number }

/** Disposable world presentation; platforms use the exact same pure map data as gameplay. */
export class WorldView {
  readonly platforms: Phaser.Physics.Arcade.StaticGroup;
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly far: Phaser.GameObjects.TileSprite;
  private readonly near: Phaser.GameObjects.TileSprite;
  private readonly lamps: Lantern[] = [];
  private readonly motes: Mote[] = [];
  private readonly checkpointLight: Phaser.GameObjects.Image;
  private readonly checkpointFlame: Phaser.GameObjects.Arc;
  private readonly checkpointLabel: Phaser.GameObjects.Text;
  private readonly bossCheckpointLight?: Phaser.GameObjects.Image;
  private readonly bossCheckpointFlame?: Phaser.GameObjects.Arc;
  private readonly bossCheckpointLabel?: Phaser.GameObjects.Text;
  private readonly arenaBarrier: Phaser.GameObjects.Graphics;
  private readonly exitLight: Phaser.GameObjects.Image;
  private readonly exitSeal: Phaser.GameObjects.Graphics;
  private checkpointActive = false;
  private bossCheckpointActive = false;
  private arenaLocked = false;
  private exitOpen = false;
  private seed = 2917;

  constructor(private readonly scene: Phaser.Scene, private readonly map: MapDefinition) {
    this.platforms = scene.physics.add.staticGroup();
    this.keep(scene.add.image(0, 0, 'world-sky').setOrigin(0).setScrollFactor(0).setDepth(-40));
    this.far = this.keep(scene.add.tileSprite(0, 0, 1280, 720, 'world-mountains-far').setOrigin(0).setScrollFactor(0).setDepth(-35));
    this.near = this.keep(scene.add.tileSprite(0, 0, 1280, 720, 'world-mountains-near').setOrigin(0).setScrollFactor(0).setDepth(-30));

    // Silhouette landmarks rhythmically separate the road's combat spaces.
    for (const [x, scale, flip] of [[930, 0.85, 0], [2390, 1.05, 1], [4110, 0.91, 0], [5770, 1.12, 1]]) {
      this.keep(scene.add.image(x, 596, 'world-ruin').setOrigin(0.5, 1).setScale(scale).setFlipX(flip === 1).setDepth(-12).setAlpha(0.9));
    }
    for (const [x, scale, flip] of [[-35, 1.16, 1], [1690, 0.92, 0], [3490, 0.95, 1], [4670, 1.05, 0], [6810, 0.94, 1]]) {
      this.keep(scene.add.image(x, 620, 'world-tree').setOrigin(0.5, 1).setScale(scale).setFlipX(flip === 1).setDepth(-6));
    }
    this.keep(scene.add.image(map.exit.x, 596, 'world-gate').setOrigin(0.5, 1).setDepth(-5));

    const terrain = this.keep(scene.add.graphics().setDepth(4));
    const foliage = this.keep(scene.add.graphics().setDepth(23));
    for (const platform of map.platforms) {
      const body = scene.add.rectangle(platform.x + platform.width / 2, platform.y + platform.height / 2, platform.width, platform.height, 0x000000, 0);
      scene.physics.add.existing(body, true);
      this.platforms.add(body);
      this.drawPlatform(terrain, foliage, platform);
    }
    // Warm light marks safe landings while preserving the dark void between cliffs.
    for (const x of [460, 1350, 1640, 2800, 3100, 4540, 4840, 5550, 5940, 6720]) this.makeLantern(x, 596);
    this.makeSign(560, '古道', '→');
    this.makeSign(1340, '断桥', '跃');
    this.makeSign(2920 - 140, '灯祠', '→');
    this.makeSign(5920, '沉月关', '→');

    const shrine = this.keep(scene.add.graphics().setDepth(6));
    const cx = map.checkpoint.x;
    shrine.fillStyle(0x2a4848).fillRect(cx - 59, 586, 118, 10).fillRect(cx - 46, 579, 92, 8);
    shrine.fillStyle(0x294249).fillRect(cx - 17, 509, 34, 71);
    shrine.lineStyle(2, 0x7a8970).strokeRect(cx - 18, 510, 36, 70);
    shrine.fillStyle(0x29434a).fillTriangle(cx - 40, 513, cx + 40, 513, cx, 488);
    shrine.lineStyle(2, 0xa7ab7b).lineBetween(cx - 40, 513, cx, 489).lineBetween(cx, 489, cx + 40, 513);
    shrine.fillStyle(0x112d34).fillRect(cx - 10, 524, 20, 24);
    this.checkpointLight = this.keep(scene.add.image(cx, 535, 'fx-glow').setTint(0x8eefd8).setScale(1.7).setDepth(7).setBlendMode(Phaser.BlendModes.ADD));
    this.checkpointFlame = this.keep(scene.add.circle(cx, 535, 5, 0x96cbbb).setDepth(8));
    this.checkpointLabel = this.keep(scene.add.text(cx, 464, '息灯 · 靠近休整', {
      fontFamily: 'serif', fontSize: '15px', color: '#9fb7a7', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(6));

    this.arenaBarrier = this.keep(scene.add.graphics().setDepth(19));
    const arena = map.bossArena;
    if (arena) {
      const bx = arena.checkpoint.x, ground = arena.groundY;
      const shrine = this.keep(scene.add.graphics().setDepth(6));
      shrine.fillStyle(0x294347).fillRect(bx - 47, ground - 8, 94, 8).fillRect(bx - 18, ground - 73, 36, 66);
      shrine.lineStyle(2, 0x909574, 0.8).strokeRect(bx - 19, ground - 73, 38, 66);
      shrine.fillStyle(0x33494a).fillTriangle(bx - 40, ground - 70, bx + 40, ground - 70, bx, ground - 95);
      shrine.lineStyle(2, 0xb4a674, 0.8).lineBetween(bx - 40, ground - 70, bx, ground - 95).lineBetween(bx, ground - 95, bx + 40, ground - 70);
      this.bossCheckpointLight = this.keep(scene.add.image(bx, ground - 46, 'fx-glow').setTint(0xa3e9d1).setScale(1.6).setDepth(7).setBlendMode(Phaser.BlendModes.ADD));
      this.bossCheckpointFlame = this.keep(scene.add.circle(bx, ground - 46, 5, 0x96cbbb).setDepth(8));
      this.bossCheckpointLabel = this.keep(scene.add.text(bx, ground - 118, '关前息灯 · 靠近休整', { fontFamily: 'serif', fontSize: '15px', color: '#acb99d', letterSpacing: 2 }).setOrigin(0.5).setDepth(6));
      const pillars = this.keep(scene.add.graphics().setDepth(6));
      for (const x of [arena.left, arena.right]) {
        pillars.fillStyle(0x263f44).fillRect(x - 15, ground - 100, 30, 100).fillRect(x - 22, ground - 106, 44, 9);
        pillars.lineStyle(1, 0x718175, 0.7).strokeRect(x - 15, ground - 100, 30, 100);
        pillars.lineStyle(2, 0xa99471, 0.6).strokePoints([{ x, y: ground - 91 }, { x: x + 8, y: ground - 78 }, { x, y: ground - 65 }, { x: x - 8, y: ground - 78 }, { x, y: ground - 91 }]);
      }
    }

    this.exitLight = this.keep(scene.add.image(map.exit.x, 492, 'fx-glow').setScale(3.8, 4.5).setAlpha(0.12).setTint(0xa3e9d1).setDepth(-4).setBlendMode(Phaser.BlendModes.ADD));
    this.exitSeal = this.keep(scene.add.graphics().setDepth(-3));
    this.drawExitSeal();

    for (let i = 0; i < 34; i++) {
      const x = this.random() * 1320;
      const y = 290 + this.random() * 295;
      const view = this.keep(scene.add.circle(x, y, 0.65 + this.random(), i % 5 === 0 ? 0xccbd84 : 0x789e96, 0.2 + this.random() * 0.25).setScrollFactor(0).setDepth(25));
      this.motes.push({ view, x, y, phase: this.random() * Math.PI * 2 });
    }
  }

  update(time: number, playerX: number): void {
    this.far.tilePositionX = playerX * 0.075;
    this.near.tilePositionX = playerX * 0.19;
    for (const lamp of this.lamps) {
      lamp.glow.setAlpha(0.65 + Math.sin(time * 0.0023 + lamp.phase) * 0.1);
      lamp.flame.setScale(1 + Math.sin(time * 0.006 + lamp.phase) * 0.09);
    }
    this.checkpointLight.setAlpha((this.checkpointActive ? 0.85 : 0.4) + Math.sin(time * 0.0018) * 0.08);
    this.bossCheckpointLight?.setAlpha((this.bossCheckpointActive ? 0.9 : 0.35) + Math.sin(time * 0.0018) * 0.06);
    this.drawArenaBarrier(time);
    this.exitLight.setAlpha((this.exitOpen ? 0.68 : 0.1) + Math.sin(time * 0.001) * 0.035);
    for (const mote of this.motes) {
      mote.view.x = ((mote.x - time * 0.003 + Math.sin(time * 0.0004 + mote.phase) * 14) % 1320 + 1320) % 1320 - 20;
      mote.view.y = mote.y + Math.sin(time * 0.0007 + mote.phase) * 15;
    }
  }

  setCheckpointActive(active: boolean): void {
    this.checkpointActive = active;
    this.checkpointFlame.setFillStyle(active ? 0xd3ffe7 : 0x96cbbb);
    this.checkpointLabel.setText(active ? '息灯已燃 · 归魂之所' : '息灯 · 靠近休整');
    this.checkpointLabel.setColor(active ? '#cfddba' : '#9fb7a7');
  }

  setExitOpen(open: boolean): void {
    if (this.exitOpen === open) return;
    this.exitOpen = open;
    this.drawExitSeal();
  }

  setBossCheckpointActive(active: boolean): void {
    this.bossCheckpointActive = active;
    this.bossCheckpointFlame?.setFillStyle(active ? 0xd3ffe7 : 0x96cbbb);
    this.bossCheckpointLabel?.setText(active ? '关前息灯已燃 · 归魂之所' : '关前息灯 · 靠近休整');
    this.bossCheckpointLabel?.setColor(active ? '#cfddba' : '#acb99d');
  }

  setBossArenaLocked(locked: boolean): void {
    this.arenaLocked = locked;
    this.drawArenaBarrier(0);
  }

  destroy(): void {
    // Phaser may already have destroyed the group during Scene shutdown.
    // Group.destroy is idempotent; Group.clear is not.
    this.platforms.destroy(true, true);
    for (const object of this.objects) object.destroy();
    this.objects.length = 0;
  }

  private keep<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.objects.push(object);
    return object;
  }

  private random(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  private drawPlatform(graphics: Phaser.GameObjects.Graphics, foliage: Phaser.GameObjects.Graphics, platform: PlatformDefinition): void {
    const { x, y, width, height } = platform;
    const ground = platform.style === 'ground';
    graphics.fillStyle(ground ? 0x0b222a : 0x294449).fillRect(x, y, width, height);
    graphics.fillStyle(ground ? 0x1e3e43 : 0x3d5655).fillRect(x, y, width, ground ? 19 : 6);
    graphics.fillStyle(0x657d6b).fillRect(x, y, width, 2);
    graphics.fillStyle(0x8f9980, 0.2).fillRect(x, y + 2, width, 1);
    if (ground) {
      for (let row = 0; row < 3; row++) {
        for (let sx = x - (row % 2) * 34; sx < x + width; sx += 69) {
          const left = Math.max(x + 2, sx + 3);
          const right = Math.min(x + width - 2, sx + 66);
          if (left >= right) continue;
          const sy = y + 24 + row * 32 + this.random() * 4;
          graphics.fillStyle(row === 0 ? 0x153239 : 0x102a32, 0.6 + this.random() * 0.3).fillRect(left, sy, right - left, 26);
          graphics.lineStyle(1, 0x244047, 0.5).lineBetween(left, sy, right - 8, sy);
        }
      }
      for (let i = 0; i < width / 48; i++) {
        const rx = x + this.random() * width;
        const ry = y + 92 + this.random() * 175;
        graphics.lineStyle(1, 0x213d43, 0.5).lineBetween(rx, ry, rx + 4, ry + 12).lineBetween(rx + 4, ry + 12, rx - 2, ry + 23);
      }
      graphics.fillStyle(0x030e18, 0.35).fillRect(x, y + 150, width, height - 150);
    } else {
      graphics.lineStyle(2, 0x142f37).lineBetween(x, y + height - 2, x + width, y + height - 2);
      for (let sx = x + 26; sx < x + width; sx += 42) graphics.lineStyle(1, 0x18363d).lineBetween(sx, y + 5, sx - 5, y + height);
      for (let i = 0; i < 4; i++) {
        const vx = x + 20 + this.random() * (width - 40);
        const len = 16 + this.random() * 30;
        graphics.lineStyle(1.5, 0x496656, 0.8).lineBetween(vx, y + height, vx - 4, y + height + len);
        graphics.fillStyle(0x56705c, 0.8).fillTriangle(vx - 2, y + height + len * 0.5, vx + 4, y + height + len * 0.3, vx + 1, y + height + len * 0.65);
      }
    }
    for (let gx = x + 5; gx < x + width - 5; gx += 9 + this.random() * 10) {
      const tall = this.random() > 0.88;
      const grassHeight = tall ? 20 + this.random() * 20 : 3 + this.random() * 11;
      foliage.lineStyle(1, tall ? 0x718472 : 0x48695f, tall ? 0.67 : 0.85);
      foliage.lineBetween(gx, y + 1, gx + grassHeight * 0.29, y - grassHeight);
      foliage.lineBetween(gx + 3, y + 1, gx - grassHeight * 0.24, y - grassHeight * 0.65);
      if (tall) {
        foliage.fillStyle(0x9b9871, 0.6).fillEllipse(gx + grassHeight * 0.28, y - grassHeight + 1, 3, 9);
      }
    }
    for (let i = 0; i < width / 80; i++) {
      const sx = x + this.random() * (width - 14);
      foliage.fillStyle(0x3f5d58).fillTriangle(sx, y, sx + 14, y, sx + 5, y - 5 - this.random() * 5);
    }
  }

  private makeLantern(x: number, groundY: number): void {
    const post = this.keep(this.scene.add.graphics().setDepth(5));
    const lightY = groundY - 99;
    post.fillStyle(0x284247).fillRect(x - 3, groundY - 141, 6, 141);
    post.lineStyle(2, 0x718071, 0.8).lineBetween(x + 3, groundY - 140, x + 3, groundY);
    post.lineStyle(3, 0x50605a).lineBetween(x - 5, groundY - 135, x + 31, groundY - 135);
    post.lineStyle(1, 0x7e8065).lineBetween(x + 25, groundY - 134, x + 25, lightY - 12);
    post.fillStyle(0x8b704d).fillRoundedRect(x + 16, lightY - 12, 18, 26, 3);
    post.fillStyle(0xecc27c).fillRoundedRect(x + 18, lightY - 9, 14, 20, 3);
    post.lineStyle(1, 0xa17447).lineBetween(x + 22, lightY - 8, x + 22, lightY + 11).lineBetween(x + 28, lightY - 8, x + 28, lightY + 11);
    post.fillStyle(0x40504b).fillRect(x + 14, lightY - 14, 22, 3).fillRect(x + 16, lightY + 13, 18, 3);
    const glow = this.keep(this.scene.add.image(x + 25, lightY, 'fx-glow').setScale(1.75).setDepth(8).setBlendMode(Phaser.BlendModes.ADD));
    const flame = this.keep(this.scene.add.circle(x + 25, lightY, 3, 0xffe2a5).setDepth(9));
    this.lamps.push({ glow, flame, phase: this.random() * Math.PI * 2 });
  }

  private makeSign(x: number, label: string, mark: string): void {
    const sign = this.keep(this.scene.add.graphics().setDepth(5));
    sign.fillStyle(0x344643).fillRect(x - 2, 537, 4, 59);
    sign.fillStyle(0x304442).fillRect(x - 28, 530, 62, 25);
    sign.lineStyle(1, 0x6b7962).lineBetween(x - 29, 530, x + 34, 530);
    this.keep(this.scene.add.text(x + 3, 542, `${label} ${mark}`, { fontFamily: 'serif', fontSize: '12px', color: '#a9b09a' }).setOrigin(0.5).setDepth(6));
  }

  private drawExitSeal(): void {
    const x = this.map.exit.x;
    this.exitSeal.clear();
    if (this.exitOpen) {
      this.exitSeal.lineStyle(1, 0xbad7b2, 0.35).strokeEllipse(x, 491, 107, 174);
      return;
    }
    this.exitSeal.lineStyle(1, 0xb49c70, 0.5).strokeCircle(x, 486, 45);
    this.exitSeal.lineStyle(2, 0xb49c70, 0.6).strokePoints([
      { x, y: 455 }, { x: x + 23, y: 486 }, { x, y: 517 }, { x: x - 23, y: 486 }, { x, y: 455 },
    ]);
    this.exitSeal.lineBetween(x - 12, 475, x + 12, 475).lineBetween(x, 466, x, 503).lineBetween(x - 12, 495, x + 12, 495);
  }

  private drawArenaBarrier(time: number): void {
    const g = this.arenaBarrier, arena = this.map.bossArena;
    g.clear();
    if (!this.arenaLocked || !arena) return;
    const alpha = 0.6 + Math.sin(time * 0.002) * 0.1;
    for (const x of [arena.left, arena.right]) {
      // The narrow solid line marks the physical wall; soft side glow is decorative.
      g.fillStyle(0xe2b78a, 0.08).fillRect(x - 15, 0, 30, arena.groundY);
      g.fillStyle(0xe6be8f, 0.15).fillRect(x - 6, 0, 12, arena.groundY);
      g.lineStyle(2, 0xe4bc8c, alpha).lineBetween(x, 0, x, arena.groundY);
      for (let y = arena.groundY - 145; y > 120; y -= 92) {
        g.lineStyle(1, 0xedc79b, alpha * 0.7).strokePoints([{ x, y: y - 13 }, { x: x + 6, y }, { x, y: y + 13 }, { x: x - 6, y }, { x, y: y - 13 }]);
      }
    }
  }
}
