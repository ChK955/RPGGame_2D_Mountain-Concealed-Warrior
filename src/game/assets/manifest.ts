import Phaser from 'phaser';

export interface ActorAppearance {
  bodyWidth: number;
  bodyHeight: number;
  bodyOffset: { x: number; y: number };
  scale: number;
  origin: { x: number; y: number };
}

/** Only this resource boundary knows files, source frame sizes and body alignment. */
export interface ActorAsset {
  key: string;
  source:
    | { type: 'spritesheet'; textureUrl: string; frameWidth: number; frameHeight: number }
    | { type: 'atlas'; textureUrl: string; atlasUrl: string };
  appearance: ActorAppearance;
}

export const ACTOR_ASSETS: Record<string, ActorAsset> = {
  'player-main': {
    key: 'player-main',
    source: { type: 'spritesheet', textureUrl: 'assets/characters/player.png', frameWidth: 128, frameHeight: 128 },
    appearance: { bodyWidth: 26, bodyHeight: 68, bodyOffset: { x: 51, y: 36 }, scale: 1, origin: { x: 0.5, y: 0.5 } },
  },
  'enemy-basic': {
    key: 'enemy-basic',
    source: { type: 'spritesheet', textureUrl: 'assets/characters/enemy.png', frameWidth: 128, frameHeight: 128 },
    appearance: { bodyWidth: 30, bodyHeight: 69, bodyOffset: { x: 49, y: 35 }, scale: 1, origin: { x: 0.5, y: 0.5 } },
  },
  'enemy-elite': {
    key: 'enemy-elite',
    source: { type: 'spritesheet', textureUrl: 'assets/characters/elite.png', frameWidth: 128, frameHeight: 128 },
    appearance: { bodyWidth: 32, bodyHeight: 72, bodyOffset: { x: 48, y: 32 }, scale: 1, origin: { x: 0.5, y: 0.5 } },
  },
  'level2-boss': {
    key: 'level2-boss',
    source: { type: 'spritesheet', textureUrl: 'assets/characters/elite.png', frameWidth: 128, frameHeight: 128 },
    appearance: { bodyWidth: 32, bodyHeight: 72, bodyOffset: { x: 48, y: 32 }, scale: 1, origin: { x: 0.5, y: 0.5 } },
  },
  'npc-elder': {
    key: 'npc-elder',
    source: { type: 'spritesheet', textureUrl: 'assets/characters/enemy.png', frameWidth: 128, frameHeight: 128 },
    appearance: { bodyWidth: 30, bodyHeight: 69, bodyOffset: { x: 49, y: 35 }, scale: 1, origin: { x: 0.5, y: 0.5 } },
  },
  'npc-merchant': {
    key: 'npc-merchant',
    source: { type: 'spritesheet', textureUrl: 'assets/characters/player.png', frameWidth: 128, frameHeight: 128 },
    appearance: { bodyWidth: 26, bodyHeight: 68, bodyOffset: { x: 51, y: 36 }, scale: 1, origin: { x: 0.5, y: 0.5 } },
  },
};

const WORLD_ASSETS = {
  'world-sky': 'assets/environment/sky.png',
  'world-mountains-far': 'assets/environment/mountains-far.png',
  'world-mountains-near': 'assets/environment/mountains-near.png',
  'world-ruin': 'assets/environment/ruin.png',
  'world-gate': 'assets/environment/gate.png',
  'world-tree': 'assets/environment/tree.png',
  'fx-glow': 'assets/fx/glow.png',
  'village-sky': 'assets/environment/sky.png',
  'village-mountains': 'assets/environment/mountains-far.png',
  'village-house': 'assets/environment/ruin.png',
  'village-shop': 'assets/environment/ruin.png',
  'village-gate': 'assets/environment/gate.png',
  'mist-forest-bg': 'assets/environment/sky.png',
  'mist-tree': 'assets/environment/tree.png',
  'rock': 'assets/environment/ruin.png',
  'bridge': 'assets/environment/ruin.png',
} as const;

export function preloadAssets(scene: Phaser.Scene): void {
  for (const asset of Object.values(ACTOR_ASSETS)) {
    if (asset.source.type === 'spritesheet') {
      scene.load.spritesheet(asset.key, asset.source.textureUrl, {
        frameWidth: asset.source.frameWidth,
        frameHeight: asset.source.frameHeight,
      });
    } else {
      scene.load.atlas(asset.key, asset.source.textureUrl, asset.source.atlasUrl);
    }
  }
  for (const [key, url] of Object.entries(WORLD_ASSETS)) scene.load.image(key, url);
}

export function createActorSprite(scene: Phaser.Scene, x: number, y: number, assetKey: string): Phaser.Physics.Arcade.Sprite {
  const asset = ACTOR_ASSETS[assetKey];
  if (!asset) throw new Error(`Unknown actor asset: ${assetKey}`);
  const sprite = scene.physics.add.sprite(x, y, assetKey);
  const appearance = asset.appearance;
  sprite.setOrigin(appearance.origin.x, appearance.origin.y).setScale(appearance.scale).setDepth(20);
  sprite.setBodySize(appearance.bodyWidth, appearance.bodyHeight, false);
  sprite.setOffset(appearance.bodyOffset.x, appearance.bodyOffset.y);
  return sprite;
}
