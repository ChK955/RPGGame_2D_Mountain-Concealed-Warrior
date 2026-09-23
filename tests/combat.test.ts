import { describe, expect, it } from 'vitest';
import { AttackWindow, intersects } from '../src/game/combat/AttackWindow';

describe('melee damage windows', () => {
  it('has a windup, a limited active window, and a harmless recovery', () => {
    const attack = new AttackWindow(100, 90, 210);
    expect(attack.active).toBe(false);
    attack.advance(100);
    expect(attack.active).toBe(true);
    attack.advance(89);
    expect(attack.active).toBe(true);
    attack.advance(1);
    expect(attack.active).toBe(false);
    expect(attack.finished).toBe(false);
    attack.advance(210);
    expect(attack.finished).toBe(true);
  });
  it('damages each target at most once even across many active frames', () => {
    const attack = new AttackWindow(50, 100, 100);
    expect(attack.tryHit('enemy-a')).toBe(false);
    attack.advance(60);
    expect(attack.tryHit('enemy-a')).toBe(true);
    expect(attack.tryHit('enemy-a')).toBe(false);
    expect(attack.tryHit('enemy-b')).toBe(true);
    attack.advance(120);
    expect(attack.tryHit('enemy-c')).toBe(false);
  });
  it('requires positive overlap, not just nearby sprites', () => {
    expect(intersects({x:100,y:10,width:40,height:50},{x:139,y:30,width:30,height:40})).toBe(true);
    expect(intersects({x:100,y:10,width:40,height:50},{x:141,y:30,width:30,height:40})).toBe(false);
    expect(intersects({x:100,y:10,width:40,height:50},{x:110,y:80,width:30,height:40})).toBe(false);
  });
});
