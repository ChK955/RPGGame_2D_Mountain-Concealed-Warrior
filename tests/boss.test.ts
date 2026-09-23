import { describe, expect, it } from 'vitest';
import { bossPhaseForHealth, chooseBossSkill } from '../src/game/ai/BossActionSelector';
import { BossActionTimeline } from '../src/game/ai/BossActionTimeline';
import { BOSS_SKILLS, bossSkillForPhase } from '../src/game/config/boss';

describe('boss phase and fair selection', () => {
  it('enters new phases at the damage thresholds, without waiting for the next attack', () => {
    expect(bossPhaseForHealth(651, 1000)).toBe(1);
    expect(bossPhaseForHealth(650, 1000)).toBe(2);
    expect(bossPhaseForHealth(301, 1000)).toBe(2);
    expect(bossPhaseForHealth(300, 1000)).toBe(3);
    expect(bossPhaseForHealth(0, 1000)).toBe(3);
  });
  it('uses a readable ranged approach instead of a melee slash outside reach', () => {
    expect(chooseBossSkill(1, 320, [], () => 0)).toBe('lunge');
    expect(chooseBossSkill(1, 900, [], () => 0)).toBeNull();
  });
  it('never repeats the same move three times, even with a biased random source', () => {
    const history: string[] = [];
    for (let i = 0; i < 90; i++) {
      const skill = chooseBossSkill(3, 120, history, () => 0);
      expect(skill).not.toBeNull();
      if (skill) history.push(skill);
      if (history.length >= 3) expect(new Set(history.slice(-3)).size).toBeGreaterThan(1);
    }
  });
  it('does not leak advanced attacks into the first phase', () => {
    const selected = Array.from({ length: 20 }, (_, i) => chooseBossSkill(1, 110, [], () => i / 20));
    expect(selected.every(skill => skill === 'slash' || skill === 'lunge')).toBe(true);
  });
  it('unlocks area control in phase two and phantom pressure only in phase three', () => {
    const phase2 = new Set(Array.from({ length: 100 }, (_, i) => chooseBossSkill(2, 160, [], () => i / 100)));
    const phase3 = new Set(Array.from({ length: 100 }, (_, i) => chooseBossSkill(3, 160, [], () => i / 100)));
    expect(phase2.has('shockwave')).toBe(true);
    expect(phase2.has('combo')).toBe(true);
    expect(phase2.has('phantom')).toBe(false);
    expect(phase3.has('phantom')).toBe(true);
  });
});

describe('boss action timelines', () => {
  it('requires the complete windup before a slash can become active', () => {
    const timeline = new BossActionTimeline(BOSS_SKILLS.slash, 1000);
    expect(timeline.at(1419).stage).toBe('windup');
    expect(timeline.at(1420).stage).toBe('active');
    expect(timeline.at(1569).stage).toBe('active');
    expect(timeline.at(1570).stage).toBe('recovery');
    expect(timeline.at(2090).finished).toBe(true);
  });
  it('gives the second combo strike its own harmless and visible anticipation', () => {
    const timeline = new BossActionTimeline(BOSS_SKILLS.combo, 0);
    expect(timeline.at(559).stage).toBe('active');
    expect(timeline.at(560)).toMatchObject({ stepIndex: 1, stage: 'windup' });
    expect(timeline.at(859).stage).toBe('windup');
    expect(timeline.at(860)).toMatchObject({ stepIndex: 1, stage: 'active' });
    expect(timeline.at(1010).stage).toBe('recovery');
  });
  it('keeps the final phantom punish window long even while enraged', () => {
    const timeline = new BossActionTimeline(bossSkillForPhase('phantom', 3), 0);
    expect(timeline.at(1739)).toMatchObject({ stepIndex: 2, stage: 'active' });
    expect(timeline.at(1740).stage).toBe('recovery');
    expect(timeline.at(2889).finished).toBe(false);
    expect(timeline.at(2890).finished).toBe(true);
  });
  it('stays frozen when simulation time does not advance', () => {
    const timeline = new BossActionTimeline(BOSS_SKILLS.shockwave, 500);
    const paused = timeline.at(900);
    for (let i = 0; i < 30; i++) expect(timeline.at(900)).toEqual(paused);
    expect(timeline.at(1219).stage).toBe('windup');
    expect(timeline.at(1220).stage).toBe('active');
  });
  it('uses future-start safety and finite progress when the simulation restarts', () => {
    const timeline = new BossActionTimeline(BOSS_SKILLS.lunge, 1000);
    expect(timeline.at(0)).toMatchObject({ stage: 'windup', progress: 0, finished: false });
    expect(timeline.at(100000)).toMatchObject({ finished: true, progress: 1 });
  });
});

import { vi } from 'vitest';
import { BossController } from '../src/game/ai/BossController';
import type { Boss } from '../src/game/entities/Boss';
import type { Player } from '../src/game/entities/Player';
import type { CombatSystem } from '../src/game/combat/CombatSystem';
import { PoiseMeter } from '../src/game/components/PoiseMeter';
import { ENEMIES } from '../src/game/config/balance';
import type { TelegraphCue } from '../src/game/data/types';

function controllerFixture(random = () => 0) {
  const host = {
    hp: 1000, maxHp: 1000, alive: true, x: 500, centerY: 530,
    state: 'Idle', facing: 1, config: ENEMIES.boss,
    poise: new PoiseMeter(ENEMIES.boss.poise),
    body: { center: { x: 500, y: 530 }, bottom: 596, setVelocityX: vi.fn() },
    combatCue: null as TelegraphCue | null, attackStage: 'none', attackStartedAt: 0, attackEndsAt: 0,
    face: vi.fn(function (this: { facing: number }, direction: number) { this.facing = direction > 0 ? 1 : -1; }),
    animate: vi.fn(), advance: vi.fn(),
  };
  const player = { alive: true, x: 610, centerY: 550 };
  const combat = { melee: vi.fn(), launchProjectile: vi.fn(), cancel: vi.fn() };
  const controller = new BossController(host as unknown as Boss, random);
  controller.reset(0);
  const tick = (now: number) => controller.update(now, player as Player, combat as unknown as CombatSystem);
  return { host, player, combat, controller, tick };
}

describe('independent boss controller', () => {
  it('locks facing for a full windup and creates one attack only when active begins', () => {
    const f = controllerFixture();
    f.tick(650);
    expect(f.host.combatCue).toMatchObject({ kind: 'slash', phase: 'windup', direction: 1 });
    f.player.x = 400;
    f.tick(1069);
    expect(f.combat.melee).not.toHaveBeenCalled();
    expect(f.host.facing).toBe(1);
    f.tick(1070);
    expect(f.combat.melee).toHaveBeenCalledTimes(1);
    expect(f.combat.melee.mock.calls[0][1]).toMatchObject({ facing: 1, windup: 0, kind: 'slash' });
    f.tick(1080); f.tick(1100); f.tick(1219);
    expect(f.combat.melee).toHaveBeenCalledTimes(1);
  });

  it('cancels all old attacks and is harmless for the full phase transition', () => {
    const f = controllerFixture(); f.tick(650); f.tick(1070);
    f.host.hp = 650; f.tick(1080);
    expect(f.controller.phase).toBe(2);
    expect(f.controller.transitioning).toBe(true);
    expect(f.combat.cancel).toHaveBeenLastCalledWith(f.host, true);
    const count = f.combat.melee.mock.calls.length;
    f.tick(1929);
    expect(f.controller.transitioning).toBe(true);
    expect(f.combat.melee).toHaveBeenCalledTimes(count);
    f.tick(1930);
    expect(f.controller.transitioning).toBe(false);
    f.host.hp = 300; f.tick(1950);
    expect(f.controller.phase).toBe(3);
    expect(f.controller.transitioning).toBe(true);
  });

  it('emits two independent grounded shockwaves after its complete anticipation', () => {
    const f = controllerFixture(() => 0.999);
    f.host.hp = 600; f.player.x = 800;
    f.tick(0); f.tick(850); f.tick(1170);
    expect(f.controller.currentSkill).toBe('shockwave');
    f.tick(1889); expect(f.combat.launchProjectile).not.toHaveBeenCalled();
    f.tick(1890);
    expect(f.combat.launchProjectile).toHaveBeenCalledTimes(2);
    expect(f.combat.launchProjectile.mock.calls.map(call => call[1].facing)).toEqual([-1, 1]);
    for (const call of f.combat.launchProjectile.mock.calls) expect(call[1]).toMatchObject({ grounded: true, kind: 'shockwave', windup: 0 });
    f.tick(2070);
    expect(f.combat.cancel).toHaveBeenLastCalledWith(f.host, false);
  });

  it('freezes exactly with simulation time and stops immediately on player death', () => {
    const f = controllerFixture(); f.tick(650); f.tick(900);
    const cue = { ...f.host.combatCue };
    for (let i = 0; i < 40; i++) f.tick(900);
    expect(f.host.combatCue).toEqual(cue);
    expect(f.combat.melee).not.toHaveBeenCalled();
    f.player.alive = false; f.tick(1100);
    expect(f.combat.melee).not.toHaveBeenCalled();
    expect(f.host.combatCue).toBeNull();
    expect(f.combat.cancel).toHaveBeenLastCalledWith(f.host, true);
  });

  it('a poise break interrupts the pattern and gives a finite recovery before the next move', () => {
    const f = controllerFixture(); f.tick(650);
    f.host.poise.damage(300, 800); f.host.state = 'Stagger'; f.tick(800);
    expect(f.host.combatCue).toBeNull();
    f.tick(1200); expect(f.combat.melee).not.toHaveBeenCalled();
    f.host.poise.update(1600); f.host.state = 'Idle'; f.tick(1600);
    f.tick(1919); expect(f.host.combatCue).toBeNull();
    f.tick(1920); expect(f.host.combatCue).toMatchObject({ phase: 'windup' });
  });

  it('reset discards phase, move history, cues and existing attacks', () => {
    const f = controllerFixture(); f.host.hp = 250; f.tick(650);
    f.controller.reset(1000);
    expect(f.controller.phase).toBe(1);
    expect(f.controller.transitioning).toBe(false);
    expect(f.controller.currentSkill).toBe('');
    expect(f.host.combatCue).toBeNull();
    expect(f.combat.cancel).toHaveBeenLastCalledWith(f.host, true);
    f.host.hp = 1000; f.tick(1649);
    expect(f.combat.melee).not.toHaveBeenCalled();
    f.tick(1650); expect(f.host.combatCue).toMatchObject({ phase: 'windup' });
  });
});
