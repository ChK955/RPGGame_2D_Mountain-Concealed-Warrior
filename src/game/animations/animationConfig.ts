import Phaser from 'phaser';
import type { ActorState } from '../data/types';

export interface AnimationClip {
  key: string;
  frames: { start: number; end: number } | { names: string[] };
  frameRate: number;
  repeat: number;
}

/** Atlas replacements use { names: ['idle_00', 'idle_01', ...] }. */
export interface ActorAnimations {
  clips: Partial<Record<ActorState, AnimationClip>>;
  fallback: Partial<Record<ActorState, ActorState>>;
}

function makeClips(prefix: string): ActorAnimations {
  const row = (key: string, index: number, frameRate: number, repeat: number): AnimationClip => ({
    key: `${prefix}-${key}`, frames: { start: index * 8, end: index * 8 + 7 }, frameRate, repeat,
  });
  return {
    clips: {
      Idle: row('idle', 0, 8, -1), Run: row('run', 1, 13, -1), Jump: row('jump', 2, 12, -1),
      Fall: row('fall', 3, 10, -1), Attack: row('attack', 4, 19, 0), Skill: row('skill', 5, 18, 0),
      Hurt: row('hurt', 6, 22, 0), Death: row('death', 7, 12, 0),
    },
    fallback: { Patrol: 'Run', Chase: 'Run', Dash: 'Run', Alert: 'Idle', Telegraph: 'Idle', Recovery: 'Idle', Stagger: 'Hurt', Transition: 'Skill' },
  };
}

export const ANIMATION_CONFIG: Record<string, ActorAnimations> = {
  'player-main': makeClips('player'),
  'enemy-basic': makeClips('enemy'),
  'enemy-elite': makeClips('elite'),
};

export function registerAnimations(scene: Phaser.Scene): void {
  for (const [assetKey, config] of Object.entries(ANIMATION_CONFIG)) {
    for (const clip of Object.values(config.clips)) {
      if (scene.anims.exists(clip.key)) continue;
      const frames = 'names' in clip.frames
        ? clip.frames.names.map(frame => ({ key: assetKey, frame }))
        : scene.anims.generateFrameNumbers(assetKey, { start: clip.frames.start, end: clip.frames.end });
      scene.anims.create({ key: clip.key, frames, frameRate: clip.frameRate, repeat: clip.repeat });
    }
  }
}

/** Entity state machines own priorities. This adapter never derives state from velocity. */
export function playActorAnimation(sprite: Phaser.Physics.Arcade.Sprite, assetKey: string, state: ActorState, restart = false): void {
  const config = ANIMATION_CONFIG[assetKey];
  if (!config || !sprite.active) return;
  const clip = config.clips[state] ?? config.clips[config.fallback[state] ?? 'Idle'] ?? config.clips.Idle;
  if (clip && (restart || sprite.anims.currentAnim?.key !== clip.key)) sprite.play(clip.key);
}
