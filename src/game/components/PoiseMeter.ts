import type { PoiseConfig } from '../data/types';

export class PoiseMeter {
  readonly max: number;
  current: number;
  staggerUntil = 0;
  private lastHitAt = Number.NEGATIVE_INFINITY;
  private lastUpdatedAt = 0;

  constructor(private readonly config: PoiseConfig) {
    this.max = config.maxPoise;
    this.current = this.max;
  }

  damage(amount: number, now: number): boolean {
    this.update(now);
    if (!Number.isFinite(amount) || amount <= 0 || this.isStaggered(now)) return false;
    this.lastHitAt = now;
    this.current = Math.max(0, this.current - amount);
    if (this.current > 0) return false;
    this.staggerUntil = now + this.config.staggerDuration;
    return true;
  }

  update(now: number): void {
    if (now < this.lastUpdatedAt) return;
    if (this.staggerUntil > 0 && now >= this.staggerUntil) {
      this.current = this.max;
      this.staggerUntil = 0;
    } else if (!this.isStaggered(now)) {
      const recoveryStart = Math.max(this.lastUpdatedAt, this.lastHitAt + this.config.poiseRecoveryDelay);
      const elapsed = Math.max(0, now - recoveryStart);
      this.current = Math.min(this.max, this.current + elapsed / 1000 * this.config.poiseRecoveryRate);
    }
    this.lastUpdatedAt = now;
  }

  reset(): void {
    this.current = this.max;
    this.staggerUntil = 0;
    this.lastHitAt = Number.NEGATIVE_INFINITY;
    this.lastUpdatedAt = 0;
  }

  isStaggered(now: number): boolean { return now < this.staggerUntil; }
}
