import type { MapDefinition } from '../data/types';

/** Pure world data: a future Tiled importer can produce the same MapDefinition. */
export const DEMO_MAP: MapDefinition = {
  id: 'mistbound-old-road', name: '残灯古道', width: 7200, height: 900,
  spawn: { x: 250, y: 500 }, checkpoint: { x: 3310, y: 555 }, exit: { x: 7000, y: 555 },
  bossArena: { left:5940, right:6870, triggerX:6020, groundY:596, checkpoint:{x:5790,y:555} },
  platforms: [
    { x: 0, y: 596, width: 1430, height: 330, style: 'ground' },
    { x: 1575, y: 596, width: 1305, height: 330, style: 'ground' },
    { x: 3030, y: 596, width: 1590, height: 330, style: 'ground' },
    { x: 4765, y: 596, width: 2435, height: 330, style: 'ground' },
    { x: 620, y: 496, width: 185, height: 22, style: 'stone' },
    { x: 1100, y: 476, width: 180, height: 24, style: 'stone' },
    { x: 2010, y: 496, width: 180, height: 22, style: 'stone' },
    { x: 2520, y: 481, width: 210, height: 24, style: 'bridge' },
    { x: 3840, y: 496, width: 200, height: 24, style: 'stone' },
    { x: 4250, y: 471, width: 200, height: 24, style: 'bridge' },
    { x: 5250, y: 470, width: 180, height: 22, style: 'stone' },
  ],
  enemies: [
    { id: 'road-01', type: 'basic', x: 940, y: 556, patrolLeft: 820, patrolRight: 1090 },
    { id: 'road-02', type: 'basic', x: 1300, y: 556, patrolLeft: 1150, patrolRight: 1370 },
    { id: 'bridge-01', type: 'basic', x: 1840, y: 556, patrolLeft: 1660, patrolRight: 2420 },
    { id: 'bridge-02', type: 'fast', x: 2220, y: 556, patrolLeft: 1660, patrolRight: 2480 },
    { id: 'bridge-03', type: 'heavy', x: 2710, y: 550, patrolLeft: 2480, patrolRight: 2810 },
    { id: 'shrine-01', type: 'heavy', x: 3700, y: 550, patrolLeft: 3500, patrolRight: 4140 },
    { id: 'shrine-02', type: 'fast', x: 4030, y: 556, patrolLeft: 3500, patrolRight: 4210 },
    { id: 'shrine-03', type: 'ranged', x: 4450, y: 556, patrolLeft: 4020, patrolRight: 4540 },
    { id: 'gate-01', type: 'basic', x: 4900, y: 556, patrolLeft: 4820, patrolRight: 5550 },
    { id: 'gate-02', type: 'ranged', x: 5380, y: 556, patrolLeft: 4840, patrolRight: 5570 },
    { id: 'gate-03', type: 'fast', x: 5510, y: 556, patrolLeft: 4900, patrolRight: 5600 },
    { id: 'gate-warden', type: 'boss', x: 6510, y: 534, patrolLeft: 5980, patrolRight: 6830 },
  ],
  zones: [
    { x: 0, name: '残灯古道', subtitle: 'OLD LANTERN ROAD' },
    { x: 1450, name: '听风断桥', subtitle: 'THE BROKEN CROSSING' },
    { x: 3030, name: '无名灯祠', subtitle: 'SHRINE OF EMBERS' },
    { x: 4765, name: '沉月关', subtitle: 'THE MOONLIT GATE' },
    { x: 6690, name: '归途', subtitle: 'BEYOND THE MIST' },
  ],
};
