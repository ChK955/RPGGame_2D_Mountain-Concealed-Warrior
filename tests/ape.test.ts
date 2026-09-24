import { describe, expect, it, vi } from 'vitest';
import type { ApeBoss } from '../src/game/entities/ApeBoss';
import type { Player } from '../src/game/entities/Player';
import type { CombatSystem } from '../src/game/combat/CombatSystem';
import type { TelegraphCue } from '../src/game/data/types';
import { ENEMIES } from '../src/game/config/balance';
import { PoiseMeter } from '../src/game/components/PoiseMeter';
import { ApeController } from '../src/game/ai/ApeController';
import { APE_RULES, APE_SKILLS, chooseApeSkill } from '../src/game/config/ape';

function fixture(random = () => 0) {
  const host = {
    hp: 820, maxHp: 820, alive: true, x: 500, centerY: 550, facing: 1,
    config: ENEMIES['ape-boss'], state: 'Idle', attackStage: 'none', attackStartedAt: 0, attackEndsAt: 0,
    spawn: { patrolLeft: 100, patrolRight: 1000 },
    poise: new PoiseMeter(ENEMIES['ape-boss'].poise), combatCue: null as TelegraphCue | null,
    body: { setVelocityX: vi.fn(), setVelocityY: vi.fn(), velocity: { x: 0, y: 0 } },
    face: vi.fn(function (this: { facing: number }, direction: number) { this.facing = direction >= 0 ? 1 : -1; }),
    animate: vi.fn(), advance: vi.fn(), landAt: vi.fn(), roarFeedback: vi.fn(),
  };
  const player = { alive: true, x: 620, centerY: 550 };
  const combat = { melee: vi.fn(), launchProjectile: vi.fn(), cancel: vi.fn() };
  const controller = new ApeController(host as unknown as ApeBoss, random);
  controller.reset(0);
  const tick = (now: number) => controller.update(now, player as Player, combat as unknown as CombatSystem);
  return { host, player, combat, controller, tick };
}

describe('魇猿 independent move decisions', () => {
  it('starts in phase one, reserves roar for phase two, and forbids three identical moves', () => {
    expect(chooseApeSkill(1, 340, [], () => 0.99)).not.toBe('roar');
    const phase2 = new Set(Array.from({ length: 100 }, (_, index) => chooseApeSkill(2, 340, [], () => index / 100)));
    expect(phase2.has('roar')).toBe(true);
    const history: string[] = [];
    for (let i = 0; i < 60; i++) {
      const next = chooseApeSkill(2, 140, history, () => 0);
      expect(next).not.toBeNull();
      history.push(next!);
      if (history.length > 2) expect(new Set(history.slice(-3)).size).toBeGreaterThan(1);
    }
  });

  it('does not create claw damage before the full telegraph and locks facing', () => {
    const f = fixture();
    f.tick(APE_RULES.openingGrace);
    expect(f.host.combatCue).toMatchObject({ kind: 'slash', phase: 'windup', direction: 1 });
    f.player.x = 360;
    f.tick(APE_RULES.openingGrace + APE_SKILLS.claw.windup - 1);
    expect(f.combat.melee).not.toHaveBeenCalled();
    expect(f.host.facing).toBe(1);
    f.tick(APE_RULES.openingGrace + APE_SKILLS.claw.windup);
    expect(f.combat.melee).toHaveBeenCalledTimes(1);
    expect(f.combat.melee.mock.calls[0][1]).toMatchObject({ kind: 'slash', windup: 0, facing: 1 });
  });

  it('locks the leap landing spot when it begins and only smashes after travel', () => {
    const f = fixture(); f.player.x = 800;
    f.tick(APE_RULES.openingGrace);
    expect(f.controller.currentSkill).toBe('leap');
    const lockedX = 800;
    expect(f.controller.landingTargetX).toBe(lockedX);
    f.player.x = 620;
    f.tick(APE_RULES.openingGrace + APE_SKILLS.leap.windup);
    expect(f.controller.landingTargetX).toBe(lockedX);
    expect(f.host.body.setVelocityY).toHaveBeenCalledWith(-APE_RULES.leapJumpSpeed);
    expect(f.combat.melee).not.toHaveBeenCalled();
    f.tick(APE_RULES.openingGrace + APE_SKILLS.leap.windup + APE_SKILLS.leap.travel - 1);
    expect(f.combat.melee).not.toHaveBeenCalled();
    f.tick(APE_RULES.openingGrace + APE_SKILLS.leap.windup + APE_SKILLS.leap.travel);
    expect(f.host.landAt).toHaveBeenCalledWith(lockedX, APE_RULES.groundY);
    expect(f.combat.melee).toHaveBeenCalledTimes(1);
    expect(f.combat.melee.mock.calls[0][1]).toMatchObject({ kind: 'smash', windup: 0 });
  });

  it('throws one dodgeable projectile after winding up at distance', () => {
    const f = fixture(); f.player.x = 910;
    f.tick(APE_RULES.openingGrace);
    expect(f.controller.currentSkill).toBe('rock');
    f.tick(APE_RULES.openingGrace + APE_SKILLS.rock.windup - 1);
    expect(f.combat.launchProjectile).not.toHaveBeenCalled();
    f.player.x = 850; f.player.centerY = 430;
    f.tick(APE_RULES.openingGrace + APE_SKILLS.rock.windup);
    expect(f.combat.launchProjectile).toHaveBeenCalledTimes(1);
    expect(f.combat.launchProjectile.mock.calls[0][1]).toMatchObject({ kind: 'rock', windup: 0, piercing: false });
    expect(f.combat.launchProjectile.mock.calls[0][1].speedY).toBeLessThan(0);
    expect(f.host).toHaveProperty('rangedAim', { x: 850, y: 430 });
  });

  it('cancels current attacks and becomes harmless during the 50 percent transition', () => {
    const f = fixture(); f.tick(APE_RULES.openingGrace);
    f.host.hp = 410;
    f.tick(APE_RULES.openingGrace + 10);
    expect(f.controller.phase).toBe(2);
    expect(f.controller.transitioning).toBe(true);
    expect(f.combat.cancel).toHaveBeenLastCalledWith(f.host, true);
    const meleeCount = f.combat.melee.mock.calls.length;
    f.tick(APE_RULES.openingGrace + 10 + APE_RULES.transition - 1);
    expect(f.combat.melee).toHaveBeenCalledTimes(meleeCount);
    f.tick(APE_RULES.openingGrace + 10 + APE_RULES.transition);
    expect(f.controller.transitioning).toBe(false);
  });

  it('resets phase, cues and launched projectiles for checkpoint retries', () => {
    const f = fixture(); f.host.hp = 300; f.tick(APE_RULES.openingGrace);
    f.controller.reset(3000);
    expect(f.controller.phase).toBe(1);
    expect(f.controller.currentSkill).toBe('');
    expect(f.host.combatCue).toBeNull();
    expect(f.controller.landingTargetX).toBeNull();
    expect(f.combat.cancel).toHaveBeenLastCalledWith(f.host, true);
  });
});
