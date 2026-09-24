import type Phaser from 'phaser';
import { intersects, type Rect } from '../combat/AttackWindow';
import type { Player } from '../entities/Player';

export interface FallingRockDefinition {
  id: string;
  x: number;
  triggerLeft: number;
  triggerRight: number;
  impactY: number;
  damage: number;
  warningMs: number;
  activeMs: number;
  cooldownMs: number;
  width: number;
  height: number;
}
export interface FallingRockSnapshot {
  id: string;
  state: 'idle' | 'warning' | 'impact' | 'cooldown';
  progress: number;
  bounds: Rect;
  hit: boolean;
}
export interface FallingRockHit { id: string; damage: number; bounds: Rect }
interface RockCycle {
  definition: FallingRockDefinition;
  state: FallingRockSnapshot['state'];
  startedAt: number;
  hit: boolean;
}

export const LEVEL2_HAZARDS: readonly FallingRockDefinition[] = [
  { id: 'miasma-fall-1', x: 3380, triggerLeft: 3260, triggerRight: 3470,
    impactY: 596, damage: 20, warningMs: 650, activeMs: 190, cooldownMs: 2900,
    width: 94, height: 90 },
  { id: 'miasma-fall-2', x: 3740, triggerLeft: 3630, triggerRight: 3830,
    impactY: 596, damage: 20, warningMs: 700, activeMs: 190, cooldownMs: 3000,
    width: 94, height: 90 },
  { id: 'captain-fall', x: 4160, triggerLeft: 4060, triggerRight: 4250,
    impactY: 596, damage: 22, warningMs: 730, activeMs: 200, cooldownMs: 3200,
    width: 100, height: 94 },
];

/** Deterministic warning -> impact -> cooldown hazards, independent of enemy attacks. */
export class FallingRockHazard {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly cycles: RockCycle[];

  constructor(scene: Phaser.Scene, definitions: readonly FallingRockDefinition[]) {
    this.graphics = scene.add.graphics().setDepth(29);
    this.cycles = definitions.map(definition => ({ definition, state: 'idle', startedAt: 0, hit: false }));
  }

  get hitboxes(): Rect[] {
    return this.cycles.filter(cycle => cycle.state === 'impact').map(cycle => this.bounds(cycle.definition));
  }

  snapshot(): FallingRockSnapshot[] {
    return this.cycles.map(cycle => {
      const d = cycle.definition;
      const phaseDuration = cycle.state === 'warning' ? d.warningMs : cycle.state === 'impact' ? d.activeMs : d.cooldownMs;
      return { id: d.id, state: cycle.state, progress: Math.min(1, Math.max(0, this.lastNow - cycle.startedAt) / phaseDuration),
        bounds: this.bounds(d), hit: cycle.hit };
    });
  }

  private lastNow = 0;

  update(now: number, player: Player): FallingRockHit[] {
    this.lastNow = now;
    const hits: FallingRockHit[] = [];
    for (const cycle of this.cycles) {
      const d = cycle.definition;
      if (cycle.state === 'idle' && player.alive && player.x >= d.triggerLeft && player.x <= d.triggerRight) {
        cycle.state = 'warning';
        cycle.startedAt = now;
        cycle.hit = false;
      }
      if (cycle.state === 'warning' && now - cycle.startedAt >= d.warningMs) {
        cycle.state = 'impact';
        cycle.startedAt = now;
      }
      if (cycle.state === 'impact') {
        const box = this.bounds(d);
        if (!cycle.hit && player.alive && intersects(box, player.bounds)) {
          cycle.hit = true;
          const damage = player.receiveDamage(d.damage, player.x >= d.x ? 1 : -1, now, 210);
          if (damage > 0) hits.push({ id: d.id, damage, bounds: box });
        }
        if (now - cycle.startedAt >= d.activeMs) {
          cycle.state = 'cooldown';
          cycle.startedAt = now;
        }
      }
      if (cycle.state === 'cooldown' && now - cycle.startedAt >= d.cooldownMs) {
        cycle.state = 'idle';
        cycle.hit = false;
      }
    }
    this.render();
    return hits;
  }

  reset(now = 0): void {
    this.lastNow = now;
    for (const cycle of this.cycles) {
      cycle.state = 'idle';
      cycle.startedAt = now;
      cycle.hit = false;
    }
    this.graphics.clear();
  }

  destroy(): void { this.graphics.destroy(); }

  private bounds(d: FallingRockDefinition): Rect {
    return { x: d.x - d.width / 2, y: d.impactY - d.height,
      width: d.width, height: d.height };
  }

  private render(): void {
    const g = this.graphics;
    g.clear();
    for (const cycle of this.cycles) {
      const d = cycle.definition;
      if (cycle.state === 'warning') {
        const progress = Math.min(1, (this.lastNow - cycle.startedAt) / d.warningMs);
        const pulse = 0.22 + progress * 0.30;
        g.fillStyle(0x110c19, pulse + 0.15);
        g.fillEllipse(d.x, d.impactY - 4, d.width * (0.9 + progress * 0.25), 24);
        g.lineStyle(3, 0xf4bc83, 0.65 + progress * 0.3);
        g.strokeEllipse(d.x, d.impactY - 4, d.width * 1.1, 26);
        g.fillStyle(0xffd2a0, 0.22 + progress * 0.32);
        g.fillCircle(d.x, d.impactY - 115 + progress * 24, 19);
      } else if (cycle.state === 'impact') {
        const progress = Math.min(1, (this.lastNow - cycle.startedAt) / d.activeMs);
        g.fillStyle(0xe4cba5, 0.95);
        g.fillCircle(d.x, d.impactY - d.height * (0.5 + 0.12 * (1 - progress)), d.width * 0.42);
        g.fillStyle(0x251b20, 0.5);
        g.fillEllipse(d.x, d.impactY - 3, d.width * 1.2, 22);
      }
    }
  }
}
