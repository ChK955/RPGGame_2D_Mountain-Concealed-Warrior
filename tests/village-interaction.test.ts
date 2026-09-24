import { describe, expect, it } from 'vitest';
import { InteractionSystem, type Interactable } from '../src/game/systems/InteractionSystem';

describe('village interactions', () => {
  it('shows and activates only the nearest object inside its range', () => {
    const visits: string[] = [];
    const objects: Interactable[] = [
      { interactionId: 'elder', x: 120, y: 560, interactionRange: 100, promptText: '[E] 与沈伯交谈', canInteract: () => true, interact: () => visits.push('elder') },
      { interactionId: 'merchant', x: 300, y: 560, interactionRange: 100, promptText: '[E] 查看商店', canInteract: () => true, interact: () => visits.push('merchant') },
    ];
    const system = new InteractionSystem(objects);
    expect(system.nearest({ x: 270, y: 550 })?.interactionId).toBe('merchant');
    expect(system.nearest({ x: 500, y: 550 })).toBeNull();
    expect(system.activate({ x: 270, y: 550 })).toBe('merchant');
    expect(visits).toEqual(['merchant']);
  });

  it('shows a locked gate reason and never enters its level', () => {
    let entered = false;
    let lockWarnings = 0;
    const system = new InteractionSystem([{ interactionId: 'level2', x: 500, y: 550, interactionRange: 90,
      promptText: '[E] 进入雾隐古道', lockedPrompt: '[锁定] 击败镇关鬼将后开启',
      canInteract: () => false, interact: () => { entered = true; }, onLocked: () => { lockWarnings++; },
    }]);
    expect(system.nearest({ x: 520, y: 550 })?.prompt).toBe('[锁定] 击败镇关鬼将后开启');
    expect(system.activate({ x: 520, y: 550 })).toBe('locked');
    expect(entered).toBe(false);
    expect(lockWarnings).toBe(1);
  });

  it('rechecks progress at activation so an open gate does not use a stale prompt', () => {
    let unlocked = false;
    let entries = 0;
    const system = new InteractionSystem([{ interactionId: 'level1', x: 500, y: 550, interactionRange: 90,
      promptText: '[E] 进入沉月山林', lockedPrompt: '[锁定] 完成训练后开启',
      canInteract: () => unlocked, interact: () => { entries++; },
    }]);
    expect(system.nearest({ x: 500, y: 550 })?.locked).toBe(true);
    unlocked = true;
    expect(system.activate({ x: 500, y: 550 })).toBe('level1');
    expect(entries).toBe(1);
  });
});
