import { describe, expect, it, vi } from 'vitest';
import { GameState } from '../src/game/data/GameState';
import { getDialogue } from '../src/game/data/dialogueData';
import { DialogueSystem } from '../src/game/systems/DialogueSystem';

describe('village dialogue', () => {
  it('selects short elder and merchant lines from world progress', () => {
    const state = new GameState({ x: 0, y: 0 });
    const intro = getDialogue('elder', state);
    expect(intro.lines.length).toBeGreaterThanOrEqual(3);
    expect(intro.lines.length).toBeLessThanOrEqual(6);
    expect(intro.lines.join('')).toContain('青石村');
    const finalLesson = getDialogue('elder', state, 'tutorial-end');
    expect(finalLesson.lines.join('')).toContain('山门');
    expect(getDialogue('merchant', state).lines.join('')).toContain('药');
    state.completeTutorial();
    state.clearLevel('level1');
    expect(getDialogue('elder', state).lines.join('')).toContain('玄骸');
    expect(getDialogue('merchant', state).lines.join('')).toContain('护身符');
    state.clearLevel('level2');
    expect(getDialogue('elder', state).lines.join('')).toContain('魇猿');
    expect(getDialogue('merchant', state).lines.length).toBeGreaterThanOrEqual(3);
  });

  it('fires completion only when the final line is advanced', () => {
    const state = new GameState({ x: 0, y: 0 });
    const dialogue = new DialogueSystem();
    const completed = vi.fn();
    const first = dialogue.open('elder', state, completed);
    expect(first).toMatchObject({ speaker: '沈伯', index: 0, total: getDialogue('elder', state).lines.length });
    for (let i = 1; i < first!.total; i++) {
      const frame = dialogue.next();
      expect(frame?.index).toBe(i);
      expect(completed).not.toHaveBeenCalled();
    }
    expect(dialogue.next()).toBeNull();
    expect(dialogue.current).toBeNull();
    expect(completed).toHaveBeenCalledTimes(1);
    expect(dialogue.next()).toBeNull();
    expect(completed).toHaveBeenCalledTimes(1);
  });

  it('does not complete an interrupted conversation or leak its callback', () => {
    const state = new GameState({ x: 0, y: 0 });
    const dialogue = new DialogueSystem();
    const interrupted = vi.fn();
    dialogue.open('elder', state, interrupted);
    dialogue.close();
    expect(interrupted).not.toHaveBeenCalled();
    dialogue.open('merchant', state);
    while (dialogue.current) dialogue.next();
    expect(interrupted).not.toHaveBeenCalled();
  });
});
