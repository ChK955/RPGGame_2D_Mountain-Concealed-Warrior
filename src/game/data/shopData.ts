import type { WorldProgress } from '../systems/WorldRules';

export type ShopItemId = 'potion' | 'charm' | 'sharpening';
export interface ShopItem {
  id: ShopItemId;
  name: string;
  description: string;
  price: number;
  unlockCondition: 'always' | 'level1Cleared';
  purchaseLimit: number | null;
  effect: { kind: 'potion' | 'maxHp' | 'attackDamage'; amount: number };
}

export const SHOP_ITEMS: Record<ShopItemId, ShopItem> = {
  potion: {
    id: 'potion', name: '回春散', description: '恢复生命；最多携带五份。', price: 25,
    unlockCondition: 'always', purchaseLimit: null, effect: { kind: 'potion', amount: 1 },
  },
  charm: {
    id: 'charm', name: '护身符', description: '永久增加 15 点最大生命。', price: 140,
    unlockCondition: 'level1Cleared', purchaseLimit: 1, effect: { kind: 'maxHp', amount: 15 },
  },
  sharpening: {
    id: 'sharpening', name: '磨刃石', description: '永久增加 3 点攻击。', price: 160,
    unlockCondition: 'level1Cleared', purchaseLimit: 1, effect: { kind: 'attackDamage', amount: 3 },
  },
};

export const SHOP_ORDER: readonly ShopItemId[] = ['potion', 'charm', 'sharpening'];

export function isShopItemUnlocked(world: WorldProgress, item: ShopItem): boolean {
  return item.unlockCondition === 'always' || (world.level1Cleared && world.merchantUnlocks.includes(item.id));
}
