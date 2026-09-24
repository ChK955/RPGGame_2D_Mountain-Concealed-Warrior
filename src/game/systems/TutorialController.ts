export type TutorialStage = 'intro' | 'move' | 'jump' | 'normal-hit' | 'skill-hit' | 'dash' | 'elder' | 'complete';
export type TutorialEvent = { type: 'move'; distance: number } | { type: 'jump' | 'normal-hit' | 'skill-hit' | 'dash' | 'elder' };

const PROMPTS: Record<TutorialStage, string> = {
  intro: '与沈伯交谈 [E]',
  move: '按 A / D 移动',
  jump: '按 Space 跳跃',
  'normal-hit': '按 J 命中训练木桩',
  'skill-hit': '按 K 用剑气命中木桩',
  dash: '按 Shift 闪避',
  elder: '返回与沈伯交谈 [E]',
  complete: '',
};

/** Consumes verified game events, not button presses for dummy hit stages. */
export class TutorialController {
  stage: TutorialStage;
  private moved = 0;

  constructor(alreadyComplete = false) {
    this.stage = alreadyComplete ? 'complete' : 'intro';
  }

  get prompt(): string { return PROMPTS[this.stage]; }
  get complete(): boolean { return this.stage === 'complete'; }

  observe(event: TutorialEvent): boolean {
    switch (this.stage) {
      case 'intro': if (event.type === 'elder') { this.stage = 'move'; return true; } break;
      case 'move':
        if (event.type === 'move' && Number.isFinite(event.distance)) {
          this.moved += Math.max(0, event.distance);
          if (this.moved >= 120) { this.stage = 'jump'; return true; }
        }
        break;
      case 'jump': if (event.type === 'jump') { this.stage = 'normal-hit'; return true; } break;
      case 'normal-hit': if (event.type === 'normal-hit') { this.stage = 'skill-hit'; return true; } break;
      case 'skill-hit': if (event.type === 'skill-hit') { this.stage = 'dash'; return true; } break;
      case 'dash': if (event.type === 'dash') { this.stage = 'elder'; return true; } break;
      case 'elder': if (event.type === 'elder') { this.stage = 'complete'; return true; } break;
    }
    return false;
  }
}
