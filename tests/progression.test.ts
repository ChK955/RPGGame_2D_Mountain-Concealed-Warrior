import { describe, expect, it } from 'vitest';
import { ENEMIES, experienceForLevel } from '../src/game/config/balance';
import { GameState } from '../src/game/data/GameState';
import { rollLoot } from '../src/game/systems/lootRules';

describe('health and consumables', () => {
  it('bounds incoming damage at remaining HP and does not share player stats', () => {
    const state = new GameState({ x: 20, y: 40 });
    const other = new GameState({ x: 20, y: 40 });
    expect(state.takeDamage(500)).toBe(120);
    expect(state.stats.hp).toBe(0);
    expect(state.takeDamage(10)).toBe(0);
    expect(other.stats.hp).toBe(120);
  });

  it('does not let negative damage heal or negative healing injure', () => {
    const state = new GameState({ x: 20, y: 40 });
    state.takeDamage(30);
    expect(state.takeDamage(-50)).toBe(0);
    expect(state.heal(-50)).toBe(0);
    expect(state.stats.hp).toBe(90);
  });

  it('heals only missing HP', () => {
    const state = new GameState({ x: 20, y: 40 });
    state.takeDamage(15);
    expect(state.heal(50)).toBe(15);
    expect(state.stats.hp).toBe(120);
  });

  it('consumes one potion only when alive, injured, and carrying a potion', () => {
    const state = new GameState({ x: 20, y: 40 });
    expect(state.usePotion()).toBe(false);
    expect(state.stats.potionCount).toBe(3);
    state.takeDamage(70);
    expect(state.usePotion()).toBe(true);
    expect(state.stats.hp).toBe(105);
    expect(state.stats.potionCount).toBe(2);
    state.stats.potionCount = 0;
    expect(state.usePotion()).toBe(false);
    state.stats.potionCount = 1;
    state.takeDamage(500);
    expect(state.usePotion()).toBe(false);
    expect(state.stats.hp).toBe(0);
    expect(state.stats.potionCount).toBe(1);
  });
});

describe('experience and loot', () => {
  it('requires increasing experience per level', () => {
    expect(experienceForLevel(2)).toBeGreaterThan(experienceForLevel(1));
    expect(experienceForLevel(3)).toBeGreaterThan(experienceForLevel(2));
  });

  it('carries excess XP through multiple levels and restores bounded health', () => {
    const state = new GameState({ x: 20, y: 40 });
    state.takeDamage(100);
    expect(state.gainExperience(290)).toBe(2);
    expect(state.stats).toMatchObject({ level: 3, experience: 30, maxHp: 156, hp: 92, attackDamage: 34 });
    state.heal(500);
    expect(state.gainExperience(190)).toBe(1);
    expect(state.stats).toMatchObject({ level: 4, experience: 0, maxHp: 174, hp: 174 });
  });

  it('keeps XP before threshold and rejects a negative award', () => {
    const state = new GameState({ x: 20, y: 40 });
    expect(state.gainExperience(99)).toBe(0);
    expect(state.gainExperience(-20)).toBe(0);
    expect(state.stats).toMatchObject({ level: 1, experience: 99 });
    expect(state.gainExperience(1)).toBe(1);
    expect(state.stats).toMatchObject({ level: 2, experience: 0 });
  });

  it('awards kill XP once per grant and tracks defeated enemies', () => {
    const state = new GameState({ x: 20, y: 40 });
    state.grantKill(ENEMIES.basic);
    state.grantKill(ENEMIES.basic);
    expect(state.grantKill(ENEMIES.basic)).toBe(1);
    expect(state.kills).toBe(3);
    expect(state.stats).toMatchObject({ level: 2, experience: 35 });
  });

  it('adds pickups to separate inventory balances without accepting negative loot', () => {
    const state = new GameState({ x: 20, y: 40 });
    state.addLoot('gold', 12);
    state.addLoot('potion', 2);
    state.addLoot('gold', -4);
    state.addLoot('potion', -1);
    expect(state.stats).toMatchObject({ gold: 12, potionCount: 5 });
  });

  it('rolls gold and potions independently and includes both gold endpoints', () => {
    const drops = { ...ENEMIES.basic, goldMin: 4, goldMax: 9, goldChance: 0.5, potionChance: 0.5 };
    expect(rollLoot(drops, () => 0)).toEqual([{ kind: 'gold', amount: 4 }, { kind: 'potion', amount: 1 }]);
    const rolls = [0.1, 0.999, 0.8];
    expect(rollLoot(drops, () => rolls.shift() ?? 1)).toEqual([{ kind: 'gold', amount: 9 }]);
    const potionRolls = [0.8, 0.1];
    expect(rollLoot(drops, () => potionRolls.shift() ?? 1)).toEqual([{ kind: 'potion', amount: 1 }]);
    expect(rollLoot(drops, () => 0.9)).toEqual([]);
  });

  it('does not drop items when their chance is zero, even on the lowest random roll', () => {
    expect(rollLoot({ ...ENEMIES.basic, goldChance: 0, potionChance: 0 }, () => 0)).toEqual([]);
  });
});

describe('checkpoints and new runs', () => {
  it('activates supply once and keeps a copy of checkpoint coordinates', () => {
    const spawn = { x: 20, y: 40 };
    const state = new GameState(spawn);
    spawn.x = 900;
    expect(state.checkpoint).toEqual({ x: 20, y: 40 });
    state.takeDamage(100);
    state.stats.potionCount = 0;
    const checkpoint = { x: 1500, y: 380 };
    expect(state.activateCheckpoint(checkpoint)).toBe(true);
    checkpoint.x = 9000;
    expect(state.checkpoint).toEqual({ x: 1500, y: 380 });
    expect(state.checkpointActive).toBe(true);
    expect(state.stats).toMatchObject({ hp: 120, potionCount: 3 });
    state.takeDamage(25);
    state.stats.potionCount = 2;
    expect(state.activateCheckpoint({ x: 1500, y: 380 })).toBe(false);
    expect(state.stats).toMatchObject({ hp: 95, potionCount: 2 });
  });

  it('does not remove surplus potions when activating the checkpoint', () => {
    const state = new GameState({ x: 20, y: 40 });
    state.addLoot('potion', 3);
    state.activateCheckpoint({ x: 1500, y: 380 });
    expect(state.stats.potionCount).toBe(6);
  });

  it('respawns with full health while preserving checkpoint, kills, and progression', () => {
    const state = new GameState({ x: 20, y: 40 });
    state.grantKill(ENEMIES.elite);
    state.addLoot('gold', 30);
    state.activateCheckpoint({ x: 1500, y: 380 });
    state.takeDamage(999);
    state.respawn();
    expect(state.stats).toMatchObject({ hp: 156, maxHp: 156, level: 3, experience: 90, gold: 30, potionCount: 3 });
    expect(state.kills).toBe(1);
    expect(state.checkpoint).toEqual({ x: 1500, y: 380 });
  });

  it('restarts the run with fresh progress and retains map population', () => {
    const state = new GameState({ x: 20, y: 40 });
    state.totalEnemies = 13;
    state.grantKill(ENEMIES.elite);
    state.addLoot('gold', 30);
    state.activateCheckpoint({ x: 1500, y: 380 });
    state.elapsed = 180000;
    state.completed = true;
    const spawn = { x: 50, y: 60 };
    state.reset(spawn);
    spawn.x = 999;
    expect(state.stats).toMatchObject({ hp: 120, maxHp: 120, level: 1, experience: 0, gold: 0, potionCount: 3 });
    expect(state.checkpoint).toEqual({ x: 50, y: 60 });
    expect(state.checkpointActive).toBe(false);
    expect(state.kills).toBe(0);
    expect(state.elapsed).toBe(0);
    expect(state.completed).toBe(false);
    expect(state.totalEnemies).toBe(13);
  });
});

describe('boss approach checkpoint',()=>{
  it('allows the second shrine to supply once and retry with consumables',()=>{
    const state=new GameState({x:250,y:500});
    state.activateCheckpoint({x:3310,y:555},'mid');
    state.takeDamage(80);state.stats.potionCount=0;
    expect(state.activateCheckpoint({x:5790,y:555},'boss')).toBe(true);
    expect(state.stats.hp).toBe(120);expect(state.checkpointId).toBe('boss');
    state.stats.potionCount=0;state.takeDamage(999);state.respawn();
    expect(state.stats.potionCount).toBe(3);expect(state.stats.hp).toBe(120);
    expect(state.activateCheckpoint({x:5790,y:555},'boss')).toBe(false);
  });
});
