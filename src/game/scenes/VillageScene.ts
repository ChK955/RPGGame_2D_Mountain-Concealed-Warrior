import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Actor } from '../entities/Actor';
import { CombatSystem, type AttackInstance } from '../combat/CombatSystem';
import { Effects } from '../view/Effects';
import { InputController } from '../input/InputController';
import { TutorialController } from '../systems/TutorialController';
import { DialogueSystem } from '../systems/DialogueSystem';
import { ShopSystem, type PurchaseFailure } from '../systems/ShopSystem';
import { canEnterLevel, gateMessage, villagePhase } from '../systems/WorldRules';
import { enterLevel, getWorldState } from '../systems/WorldFlow';
import { InteractionSystem, type Interactable } from '../systems/InteractionSystem';
import { experienceForLevel } from '../config/balance';
import { VillageOverlay, type VillageMode, type VillageOverlayState } from '../../ui/VillageOverlay';
import type { GameState } from '../data/GameState';
import type { Facing, Point } from '../data/types';
import type { LevelId } from '../world/levels';

const WIDTH = 3200;
const GROUND = 596;
const ELDER_X = 625;
const DUMMY_X = 925;
const MERCHANT_X = 1370;
const GATES: readonly { id: LevelId | 'level3'; x: number; name: string }[] = [
  { id: 'level1', x: 1930, name: '沉月山林' },
  { id: 'level2', x: 2440, name: '雾隐古道' },
  { id: 'level3', x: 2940, name: '未明前路' },
];

/** A durable training target with the normal Actor hitbox; it never harms the player. */
class TrainingDummy extends Actor {
  readonly faction = 'enemy' as const;
  get hp(): number { return 100000; }
  get maxHp(): number { return 100000; }
  constructor(scene: Phaser.Scene) {
    super(scene, 'training-dummy', DUMMY_X, GROUND - 40, 'enemy-basic');
    this.sprite.setVisible(false);
    this.body.setAllowGravity(false).setImmovable(true).setVelocity(0, 0);
  }
  receiveDamage(amount: number, _direction: Facing, _now: number, _knockback: number): number {
    return Math.max(0, amount);
  }
}

/** Safe hub: shared movement and combat timing, one interaction edge, disposable presentation. */
export class VillageScene extends Phaser.Scene {
  private returning = false;
  private state!: GameState;
  private player!: Player;
  private dummy!: TrainingDummy;
  private combat!: CombatSystem;
  private effects!: Effects;
  private controls!: InputController;
  private tutorial!: TutorialController;
  private dialogue = new DialogueSystem();
  private shop = new ShopSystem();
  private interactions!: InteractionSystem;
  private overlay!: VillageOverlay;
  private ground!: Phaser.Physics.Arcade.StaticGroup;
  private far!: Phaser.GameObjects.TileSprite;
  private near!: Phaser.GameObjects.TileSprite;
  private dummyArt!: Phaser.GameObjects.Graphics;
  private debugArt!: Phaser.GameObjects.Graphics;
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly gateSeals = new Map<string, Phaser.GameObjects.Graphics>();
  private readonly gateGlows = new Map<string, Phaser.GameObjects.Image>();
  private mode: VillageMode = 'gameplay';
  private transitioning = false;
  private debug = false;
  private now = 0;
  private previousX = 0;

  constructor() { super('Village'); }
  init(data?: { returning?: boolean }): void { this.returning = Boolean(data?.returning); }

  create(): void {
    this.state = getWorldState(this);
    this.tutorial = new TutorialController(this.state.world.tutorialComplete);
    this.mode = 'gameplay';
    this.transitioning = false;
    this.debug = false;
    this.now = 0;
    this.gateSeals.clear();
    this.gateGlows.clear();
    this.objects.length = 0;
    this.physics.world.setBounds(0, 0, WIDTH, 720);
    this.physics.world.resume();
    this.time.paused = false;
    this.drawVillage();
    this.debugArt = this.keep(this.add.graphics().setDepth(90));
    const spawn: Point = this.returning ? { x: 525, y: GROUND - 41 } : { x: 265, y: GROUND - 41 };
    this.player = new Player(this, this.state, spawn);
    this.previousX = this.player.x;
    this.dummy = new TrainingDummy(this);
    this.physics.add.collider(this.player.sprite, this.ground);
    this.controls = new InputController(this);
    this.effects = new Effects(this);
    this.combat = new CombatSystem({
      onSwing: attack => this.effects.swing(attack),
      onHit: (target, _damage, attack) => this.onTrainingHit(target, attack),
      onKill: () => undefined,
    }, { terrain: [{ x: 0, y: GROUND, width: WIDTH, height: 124 }], worldWidth: WIDTH });
    this.interactions = new InteractionSystem(this.makeInteractions());
    this.overlay = new VillageOverlay(document.querySelector<HTMLElement>('#hud-root')!, {
      onPause: () => this.setMode('paused'),
      onResume: () => this.setMode('gameplay'),
      onClose: () => this.closeModal(),
      onDialogueNext: () => this.advanceDialogue(),
      onBuy: id => this.buy(id),
    });
    this.cameras.main.setBounds(0, 0, WIDTH, 720);
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0, -180, 0);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.fadeIn(350, 15, 24, 28);
    this.refreshGates();
    if (this.returning) {
      const phase = villagePhase(this.state.world);
      this.overlay.notify(phase === 'level2Cleared' ? '第二章完成 · 古道雾散，青石村灯火依旧' : '归村 · 第二道山门已开启', 'success');
    } else this.overlay.notify('青石村 · 先与沈伯交谈', 'info');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyScene());
    this.renderOverlay();
  }

  update(_time: number, delta: number): void {
    const intent = this.controls.sample();
    if (intent.debug) this.debug = !this.debug;
    if (this.transitioning) { this.renderOverlay(); return; }
    if (this.mode === 'dialogue') {
      if (intent.pause) this.closeModal();
      else if (intent.interact || intent.jump) this.advanceDialogue();
      this.renderOverlay(); return;
    }
    if (this.mode === 'shop') {
      if (intent.pause) this.closeModal();
      this.renderOverlay(); return;
    }
    if (this.mode === 'paused') {
      if (intent.pause) this.setMode('gameplay');
      this.renderOverlay(); return;
    }
    if (intent.pause) { this.setMode('paused'); this.renderOverlay(); return; }
    if (intent.interact) {
      this.interactions.activate({ x: this.player.x, y: this.player.y });
      if (this.mode !== 'gameplay' || this.transitioning) { this.renderOverlay(); return; }
    }
    const dt = Math.min(delta, 40);
    this.now += dt;
    if (intent.potion && this.state.usePotion()) this.overlay.notify('服用回春散 · 气血恢复', 'success');
    const wasGrounded = this.player.grounded;
    this.player.update(intent, this.now, this.combat);
    if (this.tutorial.stage === 'move') this.noteTutorial(this.tutorial.observe({ type: 'move', distance: Math.abs(this.player.x - this.previousX) }));
    if (intent.jump && wasGrounded && this.player.body.velocity.y < -100) this.noteTutorial(this.tutorial.observe({ type: 'jump' }));
    if (intent.dash && this.player.state === 'Dash') this.noteTutorial(this.tutorial.observe({ type: 'dash' }));
    this.previousX = this.player.x;
    this.combat.update(dt, this.now, [this.dummy]);
    this.effects.update(this.now, [], this.combat.attacks, this.player);
    this.far.tilePositionX = this.cameras.main.scrollX * 0.08;
    this.near.tilePositionX = this.cameras.main.scrollX * 0.19;
    this.renderOverlay();
  }

  inspect(): Record<string, unknown> {
    const nearby = this.interactions?.nearest({ x: this.player?.x ?? 0, y: this.player?.y ?? 0 });
    return {
      scene: 'Village',
      player: this.player ? { x: this.player.x, y: this.player.y, vx: this.player.body.velocity.x, vy: this.player.body.velocity.y, grounded: this.player.grounded, facing: this.player.facing, state: this.player.state } : null,
      world: this.state ? { ...this.state.world, merchantUnlocks: [...this.state.world.merchantUnlocks], purchasedItems: [...this.state.world.purchasedItems] } : null,
      stats: this.state ? { ...this.state.stats } : null,
      tutorial: this.tutorial ? { stage: this.tutorial.stage, prompt: this.tutorial.prompt } : null,
      modal: this.mode,
      nearby,
      dialogue: this.mode === 'dialogue' ? this.dialogue.current : null,
      shop: this.mode === 'shop' ? this.shop.list(this.state).map(item => ({ id: item.id, price: item.price, status: this.shop.canPurchase(this.state, item.id) })) : null,
      attacks: this.combat?.attacks.map(attack => ({ id: attack.id, kind: attack.kind, active: attack.window.active, bounds: { ...attack.bounds } })) ?? [],
      activeObjects: this.objects.length + 2,
    };
  }

  private makeInteractions(): Interactable[] {
    const npc = (interactionId: string, x: number, promptText: string, interact: () => void): Interactable => ({
      interactionId, x, y: GROUND - 40, interactionRange: 116,
      promptText, canInteract: () => true, interact,
    });
    const gates: Interactable[] = GATES.map(gate => ({
      interactionId: gate.id, x: gate.x, y: GROUND - 40, interactionRange: 125,
      promptText: () => `[E] ${gateMessage(this.state.world, gate.id)}`,
      lockedPrompt: () => `[锁定] ${gateMessage(this.state.world, gate.id)}`,
      canInteract: () => canEnterLevel(this.state.world, gate.id),
      onLocked: () => this.overlay.notify(gateMessage(this.state.world, gate.id), 'danger'),
      interact: () => gate.id !== 'level3' && this.enterGate(gate.id),
    }));
    return [npc('elder', ELDER_X, '[E] 与沈伯交谈', () => this.openElder()), npc('merchant', MERCHANT_X, '[E] 查看柳娘的商店', () => this.openMerchant()), ...gates];
  }

  private openElder(): void {
    const trainingStep = this.tutorial.stage;
    this.dialogue.open('elder', this.state, () => {
      if (trainingStep === 'intro' || trainingStep === 'elder') {
        this.noteTutorial(this.tutorial.observe({ type: 'elder' }));
        if (this.tutorial.complete && this.state.completeTutorial()) {
          this.refreshGates();
          this.overlay.notify('训练完成 · 获得铜钱与回春散 · 沉月山门开启', 'success');
        }
      }
    }, trainingStep === 'elder' ? 'tutorial-end' : 'default');
    this.setMode('dialogue');
  }

  private openMerchant(): void {
    this.dialogue.open('merchant', this.state, () => this.openShop());
    this.setMode('dialogue');
  }

  private advanceDialogue(): void {
    this.dialogue.next();
    if (this.mode === 'dialogue' && !this.dialogue.current) this.setMode('gameplay');
  }

  private openShop(): void { this.setMode('shop'); }

  private buy(id: string): void {
    if (this.mode !== 'shop') return;
    const result = this.shop.purchase(this.state, id);
    if (result.ok) this.overlay.notify(`${result.item.name} · 已购入`, 'success');
    else this.overlay.notify(this.purchaseMessage(result.reason), 'danger');
    this.renderOverlay();
  }

  private purchaseMessage(reason: PurchaseFailure): string {
    switch (reason) {
      case 'insufficient-gold': return '铜钱不足';
      case 'at-capacity': return '回春散已带满';
      case 'sold-out': return '这件物品已购入';
      case 'locked': return '尚未解锁';
      default: return '现在无法购买';
    }
  }

  private closeModal(): void {
    if (this.mode === 'dialogue') this.dialogue.close();
    this.setMode('gameplay');
  }

  private setMode(next: VillageMode): void {
    if (this.mode === next) return;
    const wasGameplay = this.mode === 'gameplay';
    this.mode = next;
    if (next === 'gameplay') {
      this.physics.world.resume();
      this.player.sprite.anims.resume();
    } else if (wasGameplay) {
      this.player.body.setVelocity(0, 0).setAcceleration(0, 0);
      this.physics.world.pause();
      this.player.sprite.anims.pause();
    }
    this.controls.reset();
    this.renderOverlay();
  }

  private enterGate(id: LevelId): void {
    if (this.transitioning || !canEnterLevel(this.state.world, id)) return;
    this.transitioning = true;
    this.player.body.setVelocity(0, 0).setAcceleration(0, 0);
    this.physics.world.pause();
    this.controls.reset();
    enterLevel(this, id);
  }

  private onTrainingHit(target: Actor, attack: AttackInstance): void {
    if (target !== this.dummy || attack.source !== this.player) return;
    const kind = attack.kind === 'wave' ? 'skill-hit' : 'normal-hit';
    if (this.tutorial.stage === kind) this.noteTutorial(this.tutorial.observe({ type: kind }));
    this.effects.floatText(DUMMY_X, GROUND - 136, kind === 'skill-hit' ? '剑气命中' : '命中', '#d7dfb2', 17);
    this.tweens.add({ targets: this.dummyArt, alpha: 0.55, duration: 70, yoyo: true });
  }

  private noteTutorial(advanced: boolean): void {
    if (!advanced) return;
    if (!this.tutorial.complete) this.overlay.notify(this.tutorial.prompt, 'success');
  }

  private renderOverlay(): void {
    if (!this.overlay || !this.state || !this.player) return;
    const stats = this.state.stats;
    const phase = villagePhase(this.state.world);
    const nearby = this.mode === 'gameplay' && !this.transitioning ? this.interactions?.nearest({ x: this.player.x, y: this.player.y }) : null;
    const objective = !this.tutorial.complete ? this.tutorial.prompt : phase === 'level2Cleared' ? '第二章完成 · 前路尚未开放' : phase === 'level1Cleared' ? '雾隐古道山门已开启' : '前往东侧山门，进入沉月山林';
    const shopItems = this.mode === 'shop' ? this.shop.list(this.state).map(item => {
      const status = this.shop.canPurchase(this.state, item.id);
      return { id: item.id, name: item.name, description: item.description, price: item.price, disabled: !status.ok, reason: status.ok ? undefined : this.purchaseMessage(status.reason) };
    }) : undefined;
    const snapshot: VillageOverlayState = {
      mode: this.mode,
      phase: phase === 'intro' ? 'VILLAGE_INTRO' : phase === 'level1Cleared' ? 'LEVEL1_CLEARED' : 'LEVEL2_CLEARED',
      hp: stats.hp, maxHp: stats.maxHp, level: stats.level,
      experience: stats.experience, experienceToNext: experienceForLevel(stats.level),
      gold: stats.gold, potionCount: stats.potionCount,
      objective,
      tutorialPrompt: this.tutorial.complete ? undefined : this.tutorial.prompt,
      interactionPrompt: nearby?.prompt,
      dialogue: this.dialogue.current,
      shopItems,
      debug: this.debug ? `VILLAGE / F1\nX ${Math.round(this.player.x)} · ${this.player.state}\nTutorial ${this.state.world.tutorialComplete} · Level1 ${this.state.world.level1Cleared}\nLevel2 open ${this.state.world.level2Unlocked} · clear ${this.state.world.level2Cleared}\nMode ${this.mode} · Objects ${this.objects.length + 2}` : undefined,
    };
    this.overlay.update(snapshot);
    this.drawInteractionDebug();
  }

  private drawInteractionDebug(): void {
    const g = this.debugArt;
    g.clear();
    if (!this.debug) return;
    for (const x of [ELDER_X, MERCHANT_X]) g.lineStyle(2, 0xe9d3a6, 0.75).strokeCircle(x, GROUND - 40, 116);
    for (const gate of GATES) {
      g.lineStyle(2, canEnterLevel(this.state.world, gate.id) ? 0xa9e4c6 : 0xdd9c8c, 0.82)
        .strokeCircle(gate.x, GROUND - 40, 125);
    }
  }

  private drawVillage(): void {
    this.keep(this.add.image(0, 0, 'village-sky').setOrigin(0).setScrollFactor(0).setDepth(-40));
    this.far = this.keep(this.add.tileSprite(0, 0, 1280, 720, 'village-mountains').setOrigin(0).setScrollFactor(0).setDepth(-35).setTint(0xcad6ca));
    this.near = this.keep(this.add.tileSprite(0, 0, 1280, 720, 'world-mountains-near').setOrigin(0).setScrollFactor(0).setDepth(-30).setTint(0x9eb7a5));
    const g = this.keep(this.add.graphics().setDepth(-12));
    g.fillStyle(0x1d3435, 0.56).fillRect(0, GROUND - 148, WIDTH, 148);
    for (const x of [125, 470, 1060, 1620, 2240, 2730, 3120]) this.drawHouse(g, x, 1 + (x % 3) * 0.04);
    for (const x of [350, 1120, 1710, 2160, 2650]) this.drawLantern(g, x, this.state.world.level1Cleared || x < 1800);
    const road = this.keep(this.add.graphics().setDepth(3));
    road.fillStyle(0x223d3d).fillRect(0, GROUND, WIDTH, 124);
    road.fillStyle(0x4d6b5c).fillRect(0, GROUND, WIDTH, 9);
    road.lineStyle(1, 0x789279, 0.5).lineBetween(0, GROUND + 1, WIDTH, GROUND + 1);
    for (let x = 25; x < WIDTH; x += 97) {
      road.fillStyle(0x294948, 0.55).fillRoundedRect(x, GROUND + 23 + x % 11, 70, 27, 4);
      road.lineStyle(1, 0x54736b, 0.3).strokeRoundedRect(x, GROUND + 23 + x % 11, 70, 27, 4);
    }
    this.ground = this.physics.add.staticGroup();
    const groundBody = this.add.rectangle(WIDTH / 2, GROUND + 62, WIDTH, 124, 0, 0);
    this.physics.add.existing(groundBody, true);
    this.ground.add(groundBody);
    this.drawWell(435);
    this.drawNpc(ELDER_X, '沈伯', 0x8cae9c, 0xb8b88a);
    this.drawNpc(MERCHANT_X, '柳娘', 0xc4a18d, 0xdcc39a);
    this.drawStall(MERCHANT_X);
    this.drawDummy();
    for (const gate of GATES) this.drawGate(gate);
  }

  private drawHouse(g: Phaser.GameObjects.Graphics, x: number, scale: number): void {
    const w = 190 * scale, h = 135 * scale;
    this.keep(this.add.image(x, GROUND, 'village-house').setOrigin(0.5, 1).setScale(0.48 * scale).setTint(0x8ca899).setAlpha(0.18).setDepth(-13));
    g.fillStyle(0x263b3b).fillRect(x - w / 2, GROUND - h, w, h);
    g.fillStyle(0x536d61).fillRect(x - w / 2, GROUND - h, w, 9);
    g.fillStyle(0x1a2e33).fillTriangle(x - w / 2 - 22, GROUND - h + 3, x + w / 2 + 22, GROUND - h + 3, x, GROUND - h - 65);
    g.lineStyle(4, 0x879677, 0.65).lineBetween(x - w / 2 - 20, GROUND - h + 4, x, GROUND - h - 65).lineBetween(x, GROUND - h - 65, x + w / 2 + 20, GROUND - h + 4);
    g.fillStyle(0x152b30).fillRect(x - 25, GROUND - 76, 50, 76);
    g.lineStyle(2, 0x6f8473).strokeRect(x - 25, GROUND - 76, 50, 76);
    for (const side of [-1, 1]) {
      g.fillStyle(0xd5b16e, 0.7).fillRect(x + side * 65 - 12, GROUND - 100, 24, 27);
      g.lineStyle(2, 0x5c5546).strokeRect(x + side * 65 - 12, GROUND - 100, 24, 27);
    }
  }

  private drawLantern(g: Phaser.GameObjects.Graphics, x: number, lit: boolean): void {
    g.fillStyle(0x415953).fillRect(x - 3, GROUND - 136, 6, 136);
    g.lineStyle(3, 0x607264).lineBetween(x, GROUND - 126, x + 23, GROUND - 126);
    g.fillStyle(lit ? 0xf0ba73 : 0x55695e, lit ? 0.85 : 0.7).fillRoundedRect(x + 14, GROUND - 122, 19, 31, 3);
    g.lineStyle(2, 0x8e7758).strokeRoundedRect(x + 14, GROUND - 122, 19, 31, 3);
    if (lit) this.keep(this.add.image(x + 24, GROUND - 106, 'fx-glow').setScale(1.6).setTint(0xe8b876).setAlpha(0.48).setDepth(-8).setBlendMode(Phaser.BlendModes.ADD));
  }

  private drawWell(x: number): void {
    const g = this.keep(this.add.graphics().setDepth(5));
    g.fillStyle(0x4a625a).fillEllipse(x, GROUND - 11, 100, 25).fillRect(x - 50, GROUND - 55, 100, 42);
    g.lineStyle(3, 0x8a9980).strokeEllipse(x, GROUND - 54, 100, 26);
    g.fillStyle(0x11282f).fillEllipse(x, GROUND - 53, 77, 18);
    g.lineStyle(2, 0x5d776b).lineBetween(x - 34, GROUND - 85, x - 34, GROUND - 38).lineBetween(x + 34, GROUND - 85, x + 34, GROUND - 38);
    g.lineBetween(x - 44, GROUND - 85, x + 44, GROUND - 85);
  }

  private drawNpc(x: number, name: string, cloak: number, trim: number): void {
    const key = name === '沈伯' ? 'npc-elder' : 'npc-merchant';
    this.keep(this.add.sprite(x, GROUND - 57, key, 0).setScale(0.9).setTint(cloak).setAlpha(0.32).setDepth(16));
    const g = this.keep(this.add.graphics().setDepth(17));
    g.fillStyle(0x162c30, 0.45).fillEllipse(x, GROUND - 3, 61, 13);
    g.fillStyle(cloak).fillTriangle(x - 25, GROUND - 5, x + 25, GROUND - 5, x, GROUND - 92);
    g.fillStyle(0xc9bea0).fillCircle(x, GROUND - 102, 13);
    g.fillStyle(trim).fillRoundedRect(x - 19, GROUND - 86, 38, 8, 3);
    g.lineStyle(2, 0x243b39).lineBetween(x - 8, GROUND - 25, x - 11, GROUND - 3).lineBetween(x + 8, GROUND - 25, x + 11, GROUND - 3);
    this.keep(this.add.text(x, GROUND - 149, name, { fontFamily: '"Songti SC", serif', fontSize: '18px', color: '#e7dcc0', stroke: '#102125', strokeThickness: 4 }).setOrigin(0.5).setDepth(21));
    this.keep(this.add.image(x, GROUND - 132, 'fx-glow').setScale(0.8).setTint(0xd4c194).setAlpha(0.25).setDepth(16));
  }

  private drawStall(x: number): void {
    this.keep(this.add.image(x, GROUND - 15, 'village-shop').setOrigin(0.5, 1).setScale(0.63).setTint(0x9fb29c).setAlpha(0.2).setDepth(6));
    const g = this.keep(this.add.graphics().setDepth(7));
    g.fillStyle(0x324a46).fillRect(x - 128, GROUND - 50, 256, 50);
    g.fillStyle(0x816b52).fillRect(x - 150, GROUND - 57, 300, 12);
    g.fillStyle(0x5d7565).fillTriangle(x - 156, GROUND - 120, x + 156, GROUND - 120, x, GROUND - 168);
    g.lineStyle(2, 0xc5ad7b).lineBetween(x - 156, GROUND - 120, x, GROUND - 168).lineBetween(x, GROUND - 168, x + 156, GROUND - 120);
    for (const offset of [-93, -60, 69, 102]) {
      g.fillStyle(0x90ac90).fillRoundedRect(x + offset - 9, GROUND - 75, 18, 20, 4);
      g.fillStyle(0xceb58a).fillRect(x + offset - 4, GROUND - 79, 8, 5);
    }
  }

  private drawDummy(): void {
    this.dummyArt = this.keep(this.add.graphics().setDepth(15));
    const g = this.dummyArt, x = DUMMY_X;
    g.fillStyle(0x233636, 0.6).fillEllipse(x, GROUND - 2, 75, 14);
    g.fillStyle(0x746446).fillRect(x - 8, GROUND - 126, 16, 126);
    g.fillStyle(0x9b8155).fillRoundedRect(x - 23, GROUND - 116, 46, 69, 6);
    g.lineStyle(4, 0x655a43).lineBetween(x - 49, GROUND - 97, x + 49, GROUND - 97);
    g.fillStyle(0x927a52).fillCircle(x, GROUND - 145, 17);
    g.lineStyle(2, 0xd5b47a).strokeCircle(x, GROUND - 145, 9);
    this.keep(this.add.text(x, GROUND - 195, '训练木桩', { fontFamily: '"Songti SC", serif', fontSize: '16px', color: '#cfc49c', stroke: '#142629', strokeThickness: 3 }).setOrigin(0.5).setDepth(20));
  }

  private drawGate(gate: typeof GATES[number]): void {
    const x = gate.x;
    this.keep(this.add.image(x, GROUND, 'village-gate').setOrigin(0.5, 1).setScale(0.55).setTint(0x9da994).setAlpha(0.38).setDepth(5));
    const g = this.keep(this.add.graphics().setDepth(6));
    g.fillStyle(0x2d4141).fillRect(x - 69, GROUND - 195, 29, 195).fillRect(x + 40, GROUND - 195, 29, 195);
    g.fillStyle(0x526b5d).fillRect(x - 76, GROUND - 204, 152, 16);
    g.fillStyle(0x1b3035).fillTriangle(x - 98, GROUND - 204, x + 98, GROUND - 204, x, GROUND - 261);
    g.lineStyle(3, 0x9b9d76).lineBetween(x - 98, GROUND - 205, x, GROUND - 261).lineBetween(x, GROUND - 261, x + 98, GROUND - 205);
    g.fillStyle(0x0f242a, 0.7).fillRect(x - 40, GROUND - 188, 80, 188);
    const glow = this.keep(this.add.image(x, GROUND - 100, 'fx-glow').setScale(2, 3.1).setDepth(5).setBlendMode(Phaser.BlendModes.ADD));
    this.gateGlows.set(gate.id, glow);
    this.keep(this.add.text(x, GROUND - 293, gate.name, { fontFamily: '"Songti SC", serif', fontSize: '22px', color: '#e0d7b7', stroke: '#11272a', strokeThickness: 4 }).setOrigin(0.5).setDepth(8));
    this.gateSeals.set(gate.id, this.keep(this.add.graphics().setDepth(8)));
  }

  private refreshGates(): void {
    for (const gate of GATES) {
      const open = canEnterLevel(this.state.world, gate.id);
      const g = this.gateSeals.get(gate.id);
      g?.clear();
      if (!open) {
        g?.lineStyle(2, gate.id === 'level3' ? 0x8a8f8c : 0xb79a76, 0.7).strokeCircle(gate.x, GROUND - 105, 32);
        g?.lineBetween(gate.x - 17, GROUND - 105, gate.x + 17, GROUND - 105).lineBetween(gate.x, GROUND - 121, gate.x, GROUND - 89);
      }
      this.gateGlows.get(gate.id)?.setTint(open ? 0xa9e4c6 : 0xb58d77).setAlpha(open ? 0.5 : 0.14);
    }
  }

  private keep<T extends Phaser.GameObjects.GameObject>(object: T): T { this.objects.push(object); return object; }

  private destroyScene(): void {
    this.dialogue.close();
    // Scene shutdown has already torn down its physics plugin. The destination
    // scene resumes its own clock and world in create().
    this.overlay?.destroy();
    this.controls?.destroy();
    this.combat?.clear();
    this.effects?.destroy();
    this.player?.destroy();
    this.dummy?.destroy();
    this.ground?.destroy(true, true);
    for (const object of this.objects) object.destroy();
    this.objects.length = 0;
    this.gateSeals.clear();
    this.gateGlows.clear();
  }
}
