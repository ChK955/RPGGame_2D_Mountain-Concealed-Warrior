import type { GameState } from './GameState';

export type SpeakerId = 'elder' | 'merchant';
export type DialogueContext = 'default' | 'tutorial-end';
export interface DialogueScript { speaker: string; lines: string[] }

/** Short scripts are selected from persistent flags; NPC sprites hold no story state. */
export function getDialogue(speaker: SpeakerId, state: GameState, context: DialogueContext = 'default'): DialogueScript {
  if (speaker === 'merchant') {
    if (state.world.level2Cleared) return { speaker: '柳娘', lines: [
      '魇猿倒下，雾里的路总算看得清了。',
      '你带回的东西，我会替你收好。',
      '第三道山门还得等人探明，先歇一歇吧。',
    ] };
    if (state.world.level1Cleared) return { speaker: '柳娘', lines: [
      '玄骸都挡不住你，看来该拿出好东西了。',
      '护身符护你一口气，磨刃石让剑更利。',
      '雾隐古道危险，出发前看看背包。',
    ] };
    return { speaker: '柳娘', lines: [
      '第一次进山？',
      '别逞强，药留一瓶在身上。',
      '回春散不贵，路远时能救命。',
    ] };
  }
  if (state.world.level2Cleared) return { speaker: '沈伯', lines: [
    '魇猿一倒，古道里的雾薄了些。',
    '这两座山门，你都走过了。',
    '前路还长，先在青石村歇口气。',
  ] };
  if (state.world.level1Cleared) return { speaker: '沈伯', lines: [
    '玄骸……竟真让你斩了。',
    '可山中的阴气并未散。',
    '北面的雾隐古道，昨夜开始起雾了。',
    '去前，记得向柳娘补些药。',
  ] };
  if (context === 'tutorial-end') return { speaker: '沈伯', lines: [
    '身手还算利索。',
    '沿东边山门走，便是沉月山林。',
    '带上药，别在断桥边逞强。',
  ] };
  if (state.world.tutorialComplete) return { speaker: '沈伯', lines: [
    '山门已经开了。',
    '沉月山林里有残灯可歇脚。',
    '看准敌人的前摇，再拔剑。',
  ] };
  return { speaker: '沈伯', lines: [
    '醒了？',
    '这里是青石村。',
    '山里的东西最近不太安分。',
    '先在村里活动筋骨，我再送你出山。',
  ] };
}
