import { describe, expect, it } from 'vitest';
import { GameState } from '../src/game/data/GameState';
import { SHOP_ITEMS } from '../src/game/data/shopData';
import { ShopSystem } from '../src/game/systems/ShopSystem';

describe('village merchant', () => {
  it('offers only potions before the first chapter is cleared', () => {
    const state = new GameState({ x: 0, y: 0 });
    const shop = new ShopSystem();
    expect(shop.list(state).map(item => item.id)).toEqual(['potion']);
    expect(shop.canPurchase(state, 'charm')).toMatchObject({ ok: false, reason: 'locked' });
    state.completeTutorial();
    state.clearLevel('level1');
    expect(shop.list(state).map(item => item.id)).toEqual(['potion', 'charm', 'sharpening']);
  });

  it('rejects bad balances and capacity before mutating anything', () => {
    const state = new GameState({ x: 0, y: 0 });
    const shop = new ShopSystem();
    const original = JSON.stringify(state.serialize());
    expect(shop.purchase(state, 'missing')).toMatchObject({ ok: false, reason: 'unknown-item' });
    expect(shop.purchase(state, 'potion')).toMatchObject({ ok: false, reason: 'insufficient-gold' });
    expect(JSON.stringify(state.serialize())).toBe(original);
    state.stats.gold = -5;
    expect(shop.purchase(state, 'potion')).toMatchObject({ ok: false, reason: 'invalid-balance' });
    expect(state.stats.gold).toBe(-5);
    state.stats.gold = 500;
    state.stats.potionCount = 5;
    const capped = JSON.stringify(state.serialize());
    expect(shop.purchase(state, 'potion')).toMatchObject({ ok: false, reason: 'at-capacity' });
    expect(JSON.stringify(state.serialize())).toBe(capped);
  });

  it('buys a potion and applies permanent upgrades exactly once', () => {
    const state = new GameState({ x: 0, y: 0 });
    const shop = new ShopSystem();
    state.stats.gold = 500;
    state.stats.potionCount = 2;
    expect(shop.purchase(state, 'potion').ok).toBe(true);
    expect(state.stats.potionCount).toBe(3);
    expect(state.stats.gold).toBe(500 - SHOP_ITEMS.potion.price);
    state.completeTutorial();
    state.clearLevel('level1');
    state.takeDamage(20);
    const beforeHp = state.stats.maxHp;
    const beforeAttack = state.stats.attackDamage;
    expect(shop.purchase(state, 'charm').ok).toBe(true);
    expect(state.stats.maxHp).toBe(beforeHp + 15);
    expect(state.stats.hp).toBe(beforeHp - 20 + 15);
    const afterCharm = JSON.stringify(state.serialize());
    expect(shop.purchase(state, 'charm')).toMatchObject({ ok: false, reason: 'sold-out' });
    expect(JSON.stringify(state.serialize())).toBe(afterCharm);
    expect(shop.purchase(state, 'sharpening').ok).toBe(true);
    expect(state.stats.attackDamage).toBe(beforeAttack + 3);
    expect(state.world.purchasedItems).toEqual(['charm', 'sharpening']);
  });
});
