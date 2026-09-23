export type Facing = -1 | 1;
export type ActorState = 'Idle' | 'Run' | 'Jump' | 'Fall' | 'Attack' | 'Skill' | 'Dash' | 'Hurt' | 'Death' | 'Patrol' | 'Chase' | 'Alert' | 'Telegraph' | 'Recovery' | 'Stagger' | 'Transition';
export type EnemyArchetype = 'basic' | 'fast' | 'heavy' | 'ranged' | 'boss';
export interface PoiseConfig { maxPoise:number; poiseRecoveryDelay:number; poiseRecoveryRate:number; staggerDuration:number }
export type AttackKind = 'slash' | 'lunge' | 'heavy' | 'bolt' | 'wave' | 'shockwave' | 'combo' | 'phantom';
export interface TelegraphCue {
  kind:AttackKind | 'transition'; phase:'windup'|'active'|'recovery'; progress:number;
  range:number; direction:Facing; label:string; dangerous:boolean;
}
export interface BossHudState {
  visible:boolean; name:string; hp:number; maxHp:number; phase:1|2|3;
  poise:number; maxPoise:number; state:string; skill:string; transitioning:boolean;
}
export interface ArenaConfig { left:number; right:number; triggerX:number; groundY:number; checkpoint:Point }
export interface PlayerStats {
  maxHp: number; hp: number; attackDamage: number; moveSpeed: number; jumpForce: number;
  level: number; experience: number; gold: number; potionCount: number;
}
export interface Point { x: number; y: number }
export interface HudSnapshot {
  hp: number; maxHp: number; level: number; experience: number; experienceToNext: number;
  gold: number; potionCount: number; skillCooldown: number; skillCooldownMax: number;
  dashCooldown: number; dashCooldownMax: number; location: string; objective: string;
  progress: number; kills: number; totalEnemies: number; elapsed: number; checkpointActive: boolean;
  state: ActorState; fps: number; debug: boolean; paused: boolean; dead: boolean; completed: boolean;
  boss?:BossHudState; bossCheckpointActive?:boolean;
}
export interface EnemyConfig {
  id: string; name: string; assetKey: string; maxHp: number; damage: number; speed: number;
  detectionRange: number; leashRange: number; attackRange: number; windup: number;
  active: number; recovery: number; cooldown: number; experience: number;
  goldMin: number; goldMax: number; goldChance: number; potionChance: number;
  scale: number; elite: boolean;
  archetype:EnemyArchetype; tint:number; poise:PoiseConfig;
  knockback:number; attackHeight:number; lungeSpeed?:number; lungeDuration?:number;
  preferredRange?:number; projectileSpeed?:number; projectileLifetime?:number;
}
export interface SkillConfig {
  id: string; name: string; cooldown: number; windup: number; recovery: number;
  damageMultiplier: number; speed: number; lifetime: number; width: number; height: number;
  poiseDamage?:number;
}
export interface PlatformDefinition { x: number; y: number; width: number; height: number; style?: 'ground' | 'stone' | 'bridge' }
export interface EnemySpawn { id: string; type: EnemyArchetype | 'elite'; x: number; y: number; patrolLeft: number; patrolRight: number }
export interface MapDefinition {
  id: string; name: string; width: number; height: number; spawn: Point; checkpoint: Point; exit: Point;
  platforms: PlatformDefinition[]; enemies: EnemySpawn[]; zones: { x: number; name: string; subtitle: string }[];
  bossArena?:ArenaConfig;
}
