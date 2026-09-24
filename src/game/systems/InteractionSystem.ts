import type { Point } from '../data/types';

/** Scene-owned actions; the shared input adapter supplies the single E edge. */
export interface Interactable {
  interactionId: string;
  x: number;
  y: number;
  interactionRange: number;
  promptText: string | (() => string);
  lockedPrompt?: string | (() => string);
  canInteract(): boolean;
  interact(): void;
  onLocked?(): void;
}

export interface NearbyInteraction {
  interactionId: string;
  prompt: string;
  locked: boolean;
  distance: number;
}

const value = (text: string | (() => string)): string => typeof text === 'function' ? text() : text;

export class InteractionSystem {
  constructor(private readonly objects: readonly Interactable[]) {}

  nearest(player: Point): NearbyInteraction | null {
    const object = this.closest(player);
    if (!object) return null;
    const locked = !object.canInteract();
    return {
      interactionId: object.interactionId,
      prompt: locked ? value(object.lockedPrompt ?? object.promptText) : value(object.promptText),
      locked,
      distance: Math.hypot(player.x - object.x, player.y - object.y),
    };
  }

  activate(player: Point): string | 'locked' | null {
    const object = this.closest(player);
    if (!object) return null;
    if (!object.canInteract()) { object.onLocked?.(); return 'locked'; }
    object.interact();
    return object.interactionId;
  }

  private closest(player: Point): Interactable | null {
    let closest: Interactable | null = null;
    let distance = Infinity;
    for (const object of this.objects) {
      const next = Math.hypot(player.x - object.x, player.y - object.y);
      if (next <= object.interactionRange && next < distance) { closest = object; distance = next; }
    }
    return closest;
  }
}
