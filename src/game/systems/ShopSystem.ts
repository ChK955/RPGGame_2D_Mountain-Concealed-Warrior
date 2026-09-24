import type { GameState } from '../data/GameState';
import { isShopItemUnlocked, SHOP_ITEMS, SHOP_ORDER, type ShopItem, type ShopItemId } from '../data/shopData';
import { MAX_POTIONS } from './WorldRules';

export type PurchaseFailure = 'unknown-item' | 'locked' | 'sold-out' | 'at-capacity' | 'insufficient-gold' | 'invalid-balance';
export type PurchaseResult = { ok: true; item: ShopItem } | { ok: false; reason: PurchaseFailure; item?: ShopItem };

/** Validation and mutation live together so UI cannot charge without granting an item. */
export class ShopSystem {
  list(state: GameState): ShopItem[] {
    return SHOP_ORDER.map(id => SHOP_ITEMS[id]).filter(item => isShopItemUnlocked(state.world, item));
  }

  canPurchase(state: GameState, itemId: string): PurchaseResult {
    const item = SHOP_ITEMS[itemId as ShopItemId];
    if (!item || item.id !== itemId) return { ok: false, reason: 'unknown-item' };
    if (!isShopItemUnlocked(state.world, item)) return { ok: false, reason: 'locked', item };
    if (!Number.isFinite(state.stats.gold) || state.stats.gold < 0 || !Number.isFinite(state.stats.potionCount) || state.stats.potionCount < 0) {
      return { ok: false, reason: 'invalid-balance', item };
    }
    if (item.purchaseLimit !== null && state.world.purchasedItems.filter(id => id === item.id).length >= item.purchaseLimit) {
      return { ok: false, reason: 'sold-out', item };
    }
    if (item.effect.kind === 'potion' && state.stats.potionCount + item.effect.amount > MAX_POTIONS) {
      return { ok: false, reason: 'at-capacity', item };
    }
    if (state.stats.gold < item.price) return { ok: false, reason: 'insufficient-gold', item };
    return { ok: true, item };
  }

  purchase(state: GameState, itemId: string): PurchaseResult {
    const check = this.canPurchase(state, itemId);
    if (!check.ok) return check;
    const { item } = check;
    state.stats.gold -= item.price;
    switch (item.effect.kind) {
      case 'potion': state.stats.potionCount += item.effect.amount; break;
      case 'maxHp':
        state.stats.maxHp += item.effect.amount;
        state.stats.hp = Math.min(state.stats.maxHp, state.stats.hp + item.effect.amount);
        break;
      case 'attackDamage': state.stats.attackDamage += item.effect.amount; break;
    }
    if (item.purchaseLimit !== null) state.world.purchasedItems.push(item.id);
    return check;
  }
}
