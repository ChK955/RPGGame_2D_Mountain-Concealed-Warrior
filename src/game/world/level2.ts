import type { MapDefinition } from '../data/types';

/** Four distinct areas with short gaps; every patrol remains on a complete floor span. */
export const LEVEL2_MAP: MapDefinition = {
  id: 'level2-mist-road', name: '雾隐古道', width: 5600, height: 900,
  spawn: { x: 180, y: 510 }, checkpoint: { x: 2670, y: 555 }, exit: { x: 5480, y: 555 },
  bossArena: { left: 4600, right: 5360, triggerX: 4680, groundY: 596, checkpoint: { x: 4430, y: 555 } },
  platforms: [
    { x: 0, y: 596, width: 1180, height: 330, style: 'ground' },
    { x: 1315, y: 596, width: 785, height: 330, style: 'ground' },
    { x: 2240, y: 596, width: 810, height: 330, style: 'ground' },
    { x: 3175, y: 596, width: 2425, height: 330, style: 'ground' },
    { x: 700, y: 472, width: 170, height: 24, style: 'stone' },
    { x: 1185, y: 500, width: 220, height: 20, style: 'bridge' },
    { x: 1700, y: 478, width: 250, height: 22, style: 'stone' },
    { x: 2105, y: 500, width: 230, height: 20, style: 'bridge' },
    { x: 2510, y: 480, width: 150, height: 22, style: 'stone' },
    { x: 3055, y: 500, width: 215, height: 20, style: 'bridge' },
    { x: 3440, y: 474, width: 190, height: 24, style: 'stone' },
    { x: 3880, y: 476, width: 210, height: 24, style: 'stone' },
  ],
  enemies: [
    { id: 'mist-scout', type: 'fast', x: 670, y: 556, patrolLeft: 520, patrolRight: 930 },
    { id: 'bridge-guard', type: 'basic', x: 1480, y: 556, patrolLeft: 1370, patrolRight: 1660 },
    { id: 'bridge-archer', type: 'ranged', x: 1728, y: 438, patrolLeft: 1718, patrolRight: 1744 },
    { id: 'watch-heavy', type: 'heavy', x: 2410, y: 550, patrolLeft: 2300, patrolRight: 2570 },
    { id: 'watch-fast', type: 'fast', x: 2790, y: 556, patrolLeft: 2650, patrolRight: 2950 },
    { id: 'miasma-heavy', type: 'heavy', x: 3330, y: 550, patrolLeft: 3220, patrolRight: 3500 },
    { id: 'miasma-fast', type: 'fast', x: 3610, y: 556, patrolLeft: 3480, patrolRight: 3790 },
    { id: 'miasma-archer', type: 'ranged', x: 3908, y: 436, patrolLeft: 3898, patrolRight: 3924 },
    { id: 'mist-captain', type: 'elite-heavy', x: 4280, y: 546, patrolLeft: 4150, patrolRight: 4430 },
    { id: 'ape-king', type: 'ape-boss', x: 5070, y: 528, patrolLeft: 4640, patrolRight: 5320 },
  ],
  zones: [
    { x: 0, name: '雾林入口', subtitle: 'MIST FOREST' },
    { x: 1315, name: '断桥', subtitle: 'BROKEN BRIDGE' },
    { x: 2670, name: '雾瘴古道', subtitle: 'MIAZMA ROAD' },
    { x: 4600, name: '魇猿巢穴', subtitle: 'APE LAIR' },
  ],
};
