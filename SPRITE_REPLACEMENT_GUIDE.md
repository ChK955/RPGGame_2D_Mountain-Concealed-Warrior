# Sprite 替换指南

人物的图片、切帧、动画和碰撞配置都集中在两个文件：

| 文件 | 修改内容 |
| --- | --- |
| `src/game/assets/manifest.ts` | `ACTOR_ASSETS`：资源地址、Sprite Sheet / Atlas、帧尺寸、原点、缩放、身体判定 |
| `src/game/animations/animationConfig.ts` | `ANIMATION_CONFIG`：状态映射、帧范围 / 帧名、帧率、循环 |

只替换画面时保持 `player-main`、`enemy-basic`、`enemy-elite` 三个资源键不变。`Player`、`Enemy` 与 `CombatSystem` 使用这些键和游戏状态，不读取具体 PNG 文件名。

## 1. 准备与放置图片

推荐把自己的角色放到 `public/assets/characters/` 下，例如 `my-hero-96.png`。Manifest 中对应的 URL 写为 `assets/characters/my-hero-96.png`，不要添加 `public/`。开发服务器和生产构建都会复制并加载这一路径。

当前占位资源是 1024 × 1024 PNG，每格 128 × 128、每行 8 帧、共 8 行，人物脚部锚点约在每格 `(64, 104)`。所有帧应采用一致的画布、角色比例和脚部锚点；攻击武器与披风可以超出身体判定，但不应在切帧边缘被裁掉。

使用无间隔的等尺寸网格最方便。若源图带有 margin / spacing，先整理为无间隔网格，或扩展 Manifest 的 source 类型及加载适配器来传递这两个参数。当前配置没有 margin / spacing 字段。

使用独立文件名保留自己的素材；`npm run assets` 会重建 `player.png`、`enemy.png`、`elite.png` 等脚本中的占位资源。

## 2. 实例：替换为 96 × 96 Sprite Sheet

假设新图为 768 × 768、8 列 × 8 行，每格 96 × 96。人物朝右，脚底锚点在 `(48, 84)`，身体从 Y=24 延伸至 Y=84。将图片保存为 `public/assets/characters/my-hero-96.png`。

在 `ACTOR_ASSETS` 中用下面条目替换原来的 `player-main`：

```ts
'player-main': {
  key: 'player-main',
  source: {
    type: 'spritesheet',
    textureUrl: 'assets/characters/my-hero-96.png',
    frameWidth: 96,
    frameHeight: 96,
  },
  appearance: {
    bodyWidth: 24,
    bodyHeight: 60,
    bodyOffset: { x: 36, y: 24 },
    scale: 1,
    origin: { x: 0.5, y: 0.5 },
  },
},
```

身体矩形位于帧内 X=36…60、Y=24…84，水平中心为 48，身体底边与脚底一致。`origin` 为 Sprite 的归一化原点，因此这里的 Sprite 世界坐标位于帧中心 `(48,48)`；站稳时角色原点比地面高 36 像素。无需把出生坐标改成脚底坐标。

## 3. 配置每个状态的帧

帧号从 0 开始，先从左向右、再从上向下递增。此例每行 8 帧，因此第二行从 8 开始、第八行从 56 开始。`start` 和 `end` 都包含在播放范围内。

在 `ANIMATION_CONFIG` 中替换玩家条目；其他敌人条目保持原有配置：

```ts
'player-main': {
  clips: {
    Idle:   { key: 'player-idle',   frames: { start: 0,  end: 7  }, frameRate: 8,  repeat: -1 },
    Run:    { key: 'player-run',    frames: { start: 8,  end: 15 }, frameRate: 13, repeat: -1 },
    Jump:   { key: 'player-jump',   frames: { start: 16, end: 23 }, frameRate: 12, repeat: -1 },
    Fall:   { key: 'player-fall',   frames: { start: 24, end: 31 }, frameRate: 10, repeat: -1 },
    Attack: { key: 'player-attack', frames: { start: 32, end: 39 }, frameRate: 24, repeat: 0 },
    Skill:  { key: 'player-skill',  frames: { start: 40, end: 47 }, frameRate: 20, repeat: 0 },
    Hurt:   { key: 'player-hurt',   frames: { start: 48, end: 55 }, frameRate: 36, repeat: 0 },
    Death:  { key: 'player-death',  frames: { start: 56, end: 63 }, frameRate: 12, repeat: 0 },
  },
  fallback: { Dash: 'Run', Patrol: 'Run', Chase: 'Run' },
},
```

如果你的角色每种动作只有 4 帧，就按真实排版改范围；不要直接保留这个示例的帧号。单帧 Jump 可以用 `{ start: 16, end: 16 }`。`frameRate` 单位是帧 / 秒；`repeat: -1` 循环，`repeat: 0` 播放一次。

动画总时长与游戏动作时长是两个概念。玩家普通攻击的有效伤害期由 `PLAYER_ATTACK` 控制，当前为开始后的 110…220 毫秒；仅改变帧率不会改变伤害时机。把实际挥剑 / 命中的姿势安排到这一时间附近，需要更慢的动作时再同步调整平衡配置。受伤、攻击、技能和死亡的优先级由实体状态维护，不要在 Scene 中根据移动速度再次强制播放 Idle 或 Run。

`registerAnimations()` 会跳过已经注册的同名动画。修改图片或动画定义后，请完整刷新浏览器，使 BootScene 重新加载并注册；仅从暂停菜单重开一局不会重新预加载资源。

## 4. 调整缩放、原点和身体碰撞盒

`bodyWidth`、`bodyHeight`、`bodyOffset` 使用未缩放的源帧像素。`appearance.scale` 会同时缩放画面和身体判定。例如宽 24、高 60 的身体在 `scale: 1.2` 时，世界尺寸约为 28.8 × 72。敌人的最终缩放还会乘以 `balance.ts` 中对应 `EnemyConfig.scale`；不要在两个位置无意中重复放大。

`bodyOffset` 从帧左上角计量，不是相对 Sprite 原点的偏移。`origin` 决定 Sprite 世界坐标对齐帧上的哪个位置；从 `(0.5,0.5)` 改为 `(0.5,1)` 会移动视觉与物理边界相对出生点的关系，需要重新验证地面站姿、出生高度与检查点重生。仅为了让碰撞盒包住身体，优先调 `bodyOffset` 和身体尺寸。

资源适配器用 `setBodySize(width,height,false)` 设置物理身体，用 `setOffset` 定位，不改变 Sprite 的纹理尺寸。身体判定一般包住躯干与腿，不包括长剑、披风、发梢或攻击特效。

替换更高人物时，还要检查平台下方通道净高。当前地面顶部是 Y=596，低平台底边是 Y=518，净高为 78 像素；放大后超过此高度的身体无法从下方通行，应调整地图或身体尺寸。精英目前在独立场地内行动。

## 5. 调整普通攻击 Hitbox

玩家攻击配置位于 `src/game/config/balance.ts`：

```ts
export const PLAYER_ATTACK = {
  windup: 110,
  active: 110,
  recovery: 160,
  cooldown: 400,
  range: 90,
  height: 68,
  offsetY: 0,
  knockback: 190,
};
```

时序单位为毫秒；`range` 是攻击矩形的宽度，`height` 是高度。攻击框的垂直中心为 `body.center.y + offsetY`：负值向上，正值向下，`0` 与身体中心对齐。`offsetY` 不是相对脚底或图片顶部的值。该示例换成 60 高身体后，可以先保留现有框，再用 F1 检查剑刃与有效区域；需要更窄的动作时仅修改这组配置。

判定框在 `CombatSystem` 中按朝向放到 Sprite 原点前方：朝右从 `source.x + 10` 起，朝左从 `source.x - range - 10` 起；身体大小和 `scale` 不会自动改变攻击框尺寸。只换图片不需要修改 CombatSystem。若将来确实要改变这 10 像素的前向间距，再把该参数抽到 `MeleeSpec` / 配置中。

剑气的宽度、高度、速度、存活时间、倍率及冷却在 `SKILLS.swordWave`；它不依赖角色 Sprite 的帧尺寸。敌人攻击距离在对应的 `ENEMIES` 配置中。

## 6. 使用 Texture Atlas + JSON

Manifest 已支持 Atlas。将 `my-hero-atlas.png` 与 `my-hero-atlas.json` 一起放到 `public/assets/characters/`，然后将玩家 `source` 改为：

```ts
source: {
  type: 'atlas',
  textureUrl: 'assets/characters/my-hero-atlas.png',
  atlasUrl: 'assets/characters/my-hero-atlas.json',
},
```

Atlas 不填写 `frameWidth` / `frameHeight`，帧由 JSON 命名。建议先使用每帧同一逻辑画布、关闭旋转与不一致裁切的 Atlas，以保持身体偏移一致；导出器应保留正确的源尺寸信息。`appearance` 仍按人物的逻辑源画布设定。

在 `ANIMATION_CONFIG` 中为每个动作使用 JSON 中真实存在的名称，例如：

```ts
'player-main': {
  clips: {
    Idle:   { key: 'player-idle',   frames: { names: ['idle_00', 'idle_01'] }, frameRate: 6, repeat: -1 },
    Run:    { key: 'player-run',    frames: { names: ['run_00', 'run_01', 'run_02', 'run_03'] }, frameRate: 12, repeat: -1 },
    Jump:   { key: 'player-jump',   frames: { names: ['jump_00'] }, frameRate: 1, repeat: -1 },
    Fall:   { key: 'player-fall',   frames: { names: ['fall_00'] }, frameRate: 1, repeat: -1 },
    Attack: { key: 'player-attack', frames: { names: ['attack_00', 'attack_01', 'attack_02', 'attack_03'] }, frameRate: 12, repeat: 0 },
    Skill:  { key: 'player-skill',  frames: { names: ['skill_00', 'skill_01', 'skill_02', 'skill_03'] }, frameRate: 10, repeat: 0 },
    Hurt:   { key: 'player-hurt',   frames: { names: ['hurt_00', 'hurt_01'] }, frameRate: 10, repeat: 0 },
    Death:  { key: 'player-death',  frames: { names: ['death_00', 'death_01', 'death_02', 'death_03'] }, frameRate: 6, repeat: 0 },
  },
  fallback: { Dash: 'Run', Patrol: 'Run', Chase: 'Run' },
},
```

名字需精确匹配，包括 `.png` 后缀（如果 JSON 内含有后缀）。即使 PNG 和 JSON 文件名改变，也继续使用 `player-main` 资源键与 `player-*` 动画键。这样替换格式无需修改玩家、敌人或战斗代码。

## 7. 左右翻转与现场检查

源人物默认朝右。实体用统一的 `facing` 值和 `flipX` 切换朝向，不需要再制作一套左向控制代码。若图片默认朝左，优先在素材准备阶段统一朝右。身体配置尽量关于帧中心水平对称；`flipX` 翻转画面，不会自动为非对称身体重新计算配置偏移。

完成配置后执行 `npm run dev` 并完整刷新浏览器：

1. 在空地按 A / D，检查角色朝向与攻击方向一致、脚底贴地，Idle / Run 不抖动。
2. 按 F1 查看绿色玩家身体矩形；确认没有覆盖大片透明边缘或整把长剑。
3. 在断桥前跳跃，检查上升、下落、落地姿势和碰撞盒，不应出现空中无限跳跃。
4. 面向左右分别按 J；黄色有效攻击框应位于正前方，单次挥剑只扣一次血，攻击中移动动画不应覆盖攻击。
5. 测试 K、Shift、受伤与死亡，检查状态切换及动画结束位置；精英还需检查放大后的身体。
6. 点亮灯祠、死亡重生、暂停恢复，确认资源替换没有改变游戏数据和控制流程。
7. 查看浏览器 Console 与 Network，确认没有缺失纹理、无效帧或资源 404；最后执行 `npm test` 和 `npm run build`。

如果出现“角色漂浮”先检查脚部锚点和 `bodyOffset.y + bodyHeight`；如果“身体碰撞正常但刀打不中”，检查独立 Hitbox；如果“动画串行错位”，检查帧尺寸、每行帧数及帧范围；如果“新动画没有生效”，完整刷新以重新执行 BootScene。
