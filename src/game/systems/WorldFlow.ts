import Phaser from 'phaser';
import type { GameState } from '../data/GameState';
import type { LevelId } from '../world/levels';

/** Scene changes keep the same pure GameState in the registry. */
export function getWorldState(scene: Phaser.Scene): GameState {
  const state = scene.registry.get('gameState') as GameState | undefined;
  if (!state) throw new Error('World state was not initialized by BootScene');
  return state;
}
export function enterLevel(scene: Phaser.Scene, levelId: LevelId): void {
  scene.cameras.main.fadeOut(420, 15, 24, 28);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start('Gameplay', { levelId }));
}
export function returnToVillage(scene: Phaser.Scene): void {
  scene.cameras.main.fadeOut(420, 15, 24, 28);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start('Village', { returning: true }));
}
