import { describe, expect, it } from 'vitest';
import { GameState } from '../src/game/data/GameState';
import { canEnterLevel, FIRST_CLEAR_REWARDS, gateMessage, TUTORIAL_REWARD, villagePhase } from '../src/game/systems/WorldRules';
import { TutorialController } from '../src/game/systems/TutorialController';

describe('persistent world progress', () => {
  it('starts in the village with both mountain gates locked', () => {
    const state = new GameState({ x: 100, y: 500 });
    expect(state.world).toMatchObject({ tutorialComplete: false, level1Unlocked: false, level1Cleared: false, level2Unlocked: false, level2Cleared: false, currentReturnPoint: 'intro' });
    expect(villagePhase(state.world)).toBe('intro');
    expect(canEnterLevel(state.world, 'level1')).toBe(false);
    expect(canEnterLevel(state.world, 'level2')).toBe(false);
    expect(canEnterLevel(state.world, 'level3')).toBe(false);
    expect(gateMessage(state.world, 'level3')).toContain('前路尚未开放');
    expect(state.clearLevel('level1')).toBe(false);
  });

  it('opens the first gate and grants the tutorial reward exactly once', () => {
    const state = new GameState({ x: 100, y: 500 });
    expect(state.completeTutorial()).toBe(true);
    expect(state.world).toMatchObject({ tutorialComplete: true, level1Unlocked: true });
    expect(canEnterLevel(state.world, 'level1')).toBe(true);
    expect(state.stats.gold).toBe(TUTORIAL_REWARD.gold);
    expect(state.stats.potionCount).toBe(3 + TUTORIAL_REWARD.potions);
    expect(state.completeTutorial()).toBe(false);
    expect(state.stats.gold).toBe(TUTORIAL_REWARD.gold);
    expect(state.stats.potionCount).toBe(3 + TUTORIAL_REWARD.potions);
  });

  it('awards each chapter only once while unlocking the next road', () => {
    const state = new GameState({ x: 100, y: 500 });
    state.completeTutorial();
    expect(state.clearLevel('level2')).toBe(false);
    expect(state.clearLevel('level1')).toBe(true);
    expect(state.world).toMatchObject({ level1Cleared: true, level1FirstClearRewardClaimed: true, level2Unlocked: true, currentReturnPoint: 'level1' });
    expect(villagePhase(state.world)).toBe('level1Cleared');
    expect(canEnterLevel(state.world, 'level2')).toBe(true);
    expect(state.world.merchantUnlocks).toEqual(expect.arrayContaining(['charm', 'sharpening']));
    expect(state.stats.gold).toBe(TUTORIAL_REWARD.gold + FIRST_CLEAR_REWARDS.level1.gold);
    const afterFirst = JSON.stringify(state.serialize());
    expect(state.clearLevel('level1')).toBe(false);
    expect(JSON.stringify(state.serialize())).toBe(afterFirst);
    expect(state.clearLevel('level2')).toBe(true);
    expect(state.world).toMatchObject({ level2Cleared: true, level2FirstClearRewardClaimed: true, currentReturnPoint: 'level2' });
    expect(villagePhase(state.world)).toBe('level2Cleared');
    expect(canEnterLevel(state.world, 'level3')).toBe(false);
    expect(state.stats.gold).toBe(TUTORIAL_REWARD.gold + FIRST_CLEAR_REWARDS.level1.gold + FIRST_CLEAR_REWARDS.level2.gold);
    const afterSecond = JSON.stringify(state.serialize());
    expect(state.clearLevel('level2')).toBe(false);
    expect(JSON.stringify(state.serialize())).toBe(afterSecond);
    const earnedGold = state.stats.gold;
    const earnedExperience = state.stats.experience;
    expect(state.clearLevel('level1')).toBe(false);
    expect(state.world.currentReturnPoint).toBe('level1');
    expect(state.stats.gold).toBe(earnedGold);
    expect(state.stats.experience).toBe(earnedExperience);
  });

  it('resets local checkpoints and timers on re-entry without losing growth or world flags', () => {
    const state = new GameState({ x: 100, y: 500 });
    state.completeTutorial();
    state.clearLevel('level1');
    state.gainExperience(250);
    state.stats.gold += 55;
    state.activateCheckpoint({ x: 3200, y: 550 });
    state.elapsed = 120000;
    state.completed = true;
    state.kills = 6;
    const stats = { ...state.stats };
    const world = JSON.stringify(state.world);
    const spawn = { x: 240, y: 510 };
    state.enterLevel(spawn);
    spawn.x = 999;
    expect(state.checkpoint).toEqual({ x: 240, y: 510 });
    expect(state.checkpointId).toBe('spawn');
    expect(state.checkpointActive).toBe(false);
    expect(state.visitedCheckpoints.size).toBe(0);
    expect(state.kills).toBe(0);
    expect(state.elapsed).toBe(0);
    expect(state.completed).toBe(false);
    expect(state.stats).toEqual(stats);
    expect(JSON.stringify(state.world)).toBe(world);
  });

  it('serializes nested data as detached plain JSON', () => {
    const state = new GameState({ x: 100, y: 500 });
    state.completeTutorial();
    state.activateCheckpoint({ x: 700, y: 550 }, 'mid');
    const snapshot = state.serialize();
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    snapshot.stats.gold = -900;
    snapshot.world.merchantUnlocks.push('forged');
    snapshot.checkpoint.x = -1;
    snapshot.visitedCheckpoints.push('forged');
    expect(state.stats.gold).toBe(TUTORIAL_REWARD.gold);
    expect(state.world.merchantUnlocks).toEqual([]);
    expect(state.checkpoint.x).toBe(700);
    expect(state.visitedCheckpoints.has('forged')).toBe(false);
  });

  it('never grants potions beyond the new five-item carrying limit', () => {
    const state = new GameState({ x: 100, y: 500 });
    state.addLoot('potion', 100);
    expect(state.stats.potionCount).toBe(5);
    state.completeTutorial();
    state.clearLevel('level1');
    state.activateCheckpoint({ x: 300, y: 500 }, 'boss');
    state.stats.potionCount = 4;
    state.respawn();
    expect(state.stats.potionCount).toBe(4);
  });
});

describe('village training', () => {
  it('requires the elder, actual movement, jump, dummy hits, dash, and elder again in order', () => {
    const training = new TutorialController();
    expect(training.stage).toBe('intro');
    expect(training.observe({ type: 'jump' })).toBe(false);
    expect(training.observe({ type: 'elder' })).toBe(true);
    expect(training.stage).toBe('move');
    expect(training.observe({ type: 'move', distance: 40 })).toBe(false);
    expect(training.observe({ type: 'move', distance: 85 })).toBe(true);
    expect(training.stage).toBe('jump');
    expect(training.observe({ type: 'normal-hit' })).toBe(false);
    expect(training.observe({ type: 'jump' })).toBe(true);
    expect(training.stage).toBe('normal-hit');
    expect(training.observe({ type: 'skill-hit' })).toBe(false);
    expect(training.observe({ type: 'normal-hit' })).toBe(true);
    expect(training.stage).toBe('skill-hit');
    expect(training.observe({ type: 'skill-hit' })).toBe(true);
    expect(training.stage).toBe('dash');
    expect(training.observe({ type: 'dash' })).toBe(true);
    expect(training.stage).toBe('elder');
    expect(training.observe({ type: 'elder' })).toBe(true);
    expect(training.complete).toBe(true);
    expect(training.observe({ type: 'elder' })).toBe(false);
  });

  it('skips the forced lesson on a returning save', () => {
    const training = new TutorialController(true);
    expect(training.stage).toBe('complete');
    expect(training.prompt).toBe('');
  });
});
