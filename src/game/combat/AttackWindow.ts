export interface Rect { x: number; y: number; width: number; height: number }

/** Pure timing and hit ledger, independent of sprite/tween lifetime. All times are ms. */
export class AttackWindow {
  age = 0;
  private readonly hitTargets = new Set<string>();
  constructor(readonly windup: number, readonly duration: number, readonly recovery: number) {}
  get active(): boolean { return this.age >= this.windup && this.age < this.windup + this.duration; }
  get finished(): boolean { return this.age >= this.windup + this.duration + this.recovery; }
  advance(delta: number): void { this.age += Math.max(0, delta); }
  tryHit(id: string): boolean {
    if (!this.active || this.hitTargets.has(id)) return false;
    this.hitTargets.add(id);
    return true;
  }
}

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
