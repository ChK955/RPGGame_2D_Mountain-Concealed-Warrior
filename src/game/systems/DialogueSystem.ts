import type { GameState } from '../data/GameState';
import { getDialogue, type DialogueContext, type SpeakerId } from '../data/dialogueData';

export interface DialogueFrame { speaker: string; text: string; index: number; total: number }

/** UI-neutral single active conversation; interrupted dialogue never fires its action. */
export class DialogueSystem {
  private lines: string[] = [];
  private speaker = '';
  private index = 0;
  private onComplete?: () => void;

  get current(): DialogueFrame | null {
    if (this.index >= this.lines.length) return null;
    return { speaker: this.speaker, text: this.lines[this.index], index: this.index, total: this.lines.length };
  }

  open(speaker: SpeakerId, state: GameState, onComplete?: () => void, context: DialogueContext = 'default'): DialogueFrame | null {
    this.close();
    const script = getDialogue(speaker, state, context);
    this.speaker = script.speaker;
    this.lines = [...script.lines];
    this.index = 0;
    this.onComplete = onComplete;
    return this.current;
  }

  next(): DialogueFrame | null {
    if (!this.current) return null;
    this.index += 1;
    if (this.current) return this.current;
    const finish = this.onComplete;
    this.close();
    finish?.();
    return null;
  }

  close(): void {
    this.lines = [];
    this.speaker = '';
    this.index = 0;
    this.onComplete = undefined;
  }
}
