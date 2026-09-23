import { DASH } from '../config/balance';
import type { Facing } from '../data/types';

export class DashController {
  private endsAt = 0;
  private invulnerableUntil = 0;
  readyAt = 0;
  facing: Facing = 1;
  start(now: number, facing: Facing): boolean {
    if (now < this.readyAt) return false;
    this.facing = facing;
    this.endsAt = now + DASH.duration;
    this.invulnerableUntil = now + DASH.invulnerability;
    this.readyAt = now + DASH.cooldown;
    return true;
  }
  active(now: number): boolean { return now < this.endsAt; }
  invulnerable(now: number): boolean { return now < this.invulnerableUntil; }
  reset(): void { this.endsAt = this.readyAt = this.invulnerableUntil = 0; }
}
