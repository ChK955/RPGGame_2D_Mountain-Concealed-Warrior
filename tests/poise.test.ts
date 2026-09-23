import { describe, expect, it } from 'vitest';
import { PoiseMeter } from '../src/game/components/PoiseMeter';

const config = { maxPoise: 60, poiseRecoveryDelay: 1000, poiseRecoveryRate: 20, staggerDuration: 650 };

describe('poise and finite stagger', () => {
  it('absorbs ordinary hits without stagger and breaks only at zero', () => {
    const poise = new PoiseMeter(config);
    expect(poise.damage(22, 100)).toBe(false);
    expect(poise.current).toBe(38);
    expect(poise.damage(22, 500)).toBe(false);
    expect(poise.current).toBe(16);
    expect(poise.damage(22, 900)).toBe(true);
    expect(poise.current).toBe(0);
    expect(poise.isStaggered(1000)).toBe(true);
    expect(poise.staggerUntil).toBe(1550);
  });

  it('starts gradual recovery after the last hit delay, not from the last update', () => {
    const poise = new PoiseMeter(config);
    poise.damage(40, 100);
    poise.update(1099);
    expect(poise.current).toBe(20);
    poise.update(1600);
    expect(poise.current).toBe(30);
    poise.update(5000);
    expect(poise.current).toBe(60);
  });

  it('a new hit postpones recovery', () => {
    const poise = new PoiseMeter(config);
    poise.damage(20, 100);
    poise.damage(10, 900);
    poise.update(1899);
    expect(poise.current).toBe(30);
    poise.update(2400);
    expect(poise.current).toBe(40);
  });

  it('cannot chain or extend stagger by continuously hitting a broken target', () => {
    const poise = new PoiseMeter(config);
    expect(poise.damage(100, 100)).toBe(true);
    expect(poise.damage(100, 300)).toBe(false);
    expect(poise.damage(100, 700)).toBe(false);
    expect(poise.staggerUntil).toBe(750);
    poise.update(750);
    expect(poise.isStaggered(750)).toBe(false);
    expect(poise.current).toBe(60);
    expect(poise.damage(22, 751)).toBe(false);
    expect(poise.current).toBe(38);
  });

  it('does not advance recovery while simulation time is paused', () => {
    const poise = new PoiseMeter(config);
    poise.damage(40, 100);
    poise.update(1500);
    expect(poise.current).toBe(28);
    for (let i = 0; i < 10; i++) poise.update(1500);
    expect(poise.current).toBe(28);
  });

  it('heavy poise survives six spaced basic blows and breaks on the seventh', () => {
    const poise = new PoiseMeter({ ...config, maxPoise: 150 });
    for (let i = 0; i < 6; i++) expect(poise.damage(22, i * 400)).toBe(false);
    expect(poise.current).toBe(18);
    expect(poise.damage(22, 2400)).toBe(true);
  });

  it('ignores nonpositive or nonfinite damage without postponing recovery', () => {
    const poise = new PoiseMeter(config);
    poise.damage(20, 100);
    expect(poise.damage(0, 900)).toBe(false);
    expect(poise.damage(-50, 900)).toBe(false);
    expect(poise.damage(Number.NaN, 900)).toBe(false);
    poise.update(1600);
    expect(poise.current).toBe(50);
  });

  it('reset clears damage, stagger and recovery history for a fresh encounter', () => {
    const poise = new PoiseMeter(config);
    poise.damage(100, 100);
    poise.reset();
    expect(poise.current).toBe(60);
    expect(poise.isStaggered(200)).toBe(false);
    expect(poise.damage(20, 200)).toBe(false);
    poise.update(1700);
    expect(poise.current).toBe(50);
  });
});
