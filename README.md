# 雾隐 · 残灯古道 / MISTBOUND v0.2

> 当前为 v0.2 开发中的工程快照。2026-09-24 已重新验证 65 项单元测试与生产构建通过；战斗难度调优及完整浏览器通关验收尚未完成。具体进度与已知问题见 [项目状态](docs/PROJECT_STATUS.md)。

一个可直接游玩的 2D 横版动作 RPG Demo。沿古道跨越断桥、击败守卫、点亮补给灯祠，再挑战三阶段 Boss「镇关鬼将 · 玄骸」并抵达山门。当前地图宽 7200 像素，包含 11 名敌兵（四种行为）、1 名 Boss、3 处断桥和两个检查点。

本阶段以战斗循环、稳定运行和可替换动画结构为主。人物与环境均为本项目程序化生成的原创占位素材，来源说明在 [public/assets/ART_LICENSE.txt](public/assets/ART_LICENSE.txt)。

## 启动与构建

使用 Node.js 22 或 24 与 npm；本项目开发环境为 Node.js 24.11.1。依赖使用 Phaser 3.90、TypeScript 5.7、Vite 6、Vitest 4 和 Sharp。

```bash
npm install
npm run dev
```

打开 [http://localhost:5177](http://localhost:5177)。游戏直接进入可玩场景，无需登录。端口在 `vite.config.ts` 中设置为 5177，启用了 `strictPort`；如果端口已被占用，请停止已有服务器，或显式指定其他端口：

```bash
npm run dev -- --port 5178
```

其他命令：

| 命令 | 用途 |
| --- | --- |
| `npm run build` | 先执行 TypeScript 检查，再构建静态产物到 `dist/` |
| `npm run preview` | 预览已构建的 `dist/`；访问终端打印的地址，默认端口通常为 4173 |
| `npm test` | 运行 Vitest 规则测试 |
| `npm run playtest` | 自动启动开发服务器（若尚未运行），运行浏览器操作、战斗、边界与完整通关测试 |
| `npm run assets` | 从 `scripts/generate-assets.mjs` 重建原创 PNG 占位素材 |

当前 PNG 已包含在 `public/assets/`，正常启动不需要重新生成。素材生成命令会覆盖脚本指定的占位 PNG；自己的素材建议使用独立文件名。生产构建可以由普通静态文件服务器托管，直接双击 `dist/index.html` 不属于推荐启动方式。

## 操作与游玩

| 按键 | 操作 |
| --- | --- |
| A / D，或 ← / → | 左右移动 |
| Space | 跳跃；支持短暂离地宽限和落地前输入缓冲 |
| J | 普通近战攻击 |
| K | 剑气技能，冷却 4 秒 |
| Shift | 向当前方向闪避，冷却 1.2 秒；前 160 毫秒无敌 |
| Q | 使用回春散，恢复 55 HP；满血、死亡或无药时不消耗 |
| Esc | 暂停 / 继续 |
| F1 | 显示碰撞盒、攻击范围、敌人状态与 FPS |

普攻和技能通过按下事件触发，需要重新按键来连续施放。敌人攻击前会显示地面预警与头顶标记；可以后退、跳跃或闪避后反击。近战与剑气均有独立攻击判定，同一次攻击对同一敌人最多命中一次。

点亮灯祠会恢复生命、将药品补足至至少 3 份，并记录重生点；这一补给在本局只触发一次。死亡约 1.45 秒后自动在最近出生点或灯祠重生，保留等级、经验、金币及普通敌人击杀进度。Boss 前的关前残灯位于 X5790；在这里重试时恢复全部生命，并把药品补足至至少 3 份，Boss 恢复全部 HP、韧性、第一阶段和技能冷却。存活敌人回到各自出生位置，已击杀敌人不会复活；敌人死亡动画淡出后会从场景与实体列表中移除。暂停菜单中的“重新启程”会创建全新一局。

进入 X6020 后开启 Boss 战，左右结界限制在 X5940–6870，击败玄骸后山门开放；普通敌人不要求全部击杀。切换到其他窗口会自动暂停，返回后按 Esc 或使用“继续旅程”。

## 目录结构

```text
.
├── index.html
├── package.json / package-lock.json
├── vite.config.ts / tsconfig.json
├── public/assets/
│   ├── characters/             # 玩家、普通敌人、精英 PNG 与预览图
│   ├── environment/            # 天空、山峦、遗迹、树与山门
│   ├── fx/                     # 光晕纹理
│   └── ART_LICENSE.txt
├── scripts/generate-assets.mjs # 可重复执行的原创素材生成器
├── src/
│   ├── main.ts                # Phaser、分辨率、物理与 Scene 配置
│   ├── game/
│   │   ├── scenes/            # BootScene、GameplayScene
│   │   ├── entities/          # Actor、Player、Enemy、Boss
│   │   ├── components/        # DashController、PoiseMeter
│   │   ├── ai/                # 协同、Boss 决策与招式时间线
│   │   ├── input/             # InputController / InputSource
│   │   ├── combat/            # AttackWindow、CombatSystem
│   │   ├── systems/           # GameSession、BossEncounter、LootSystem、lootRules
│   │   ├── data/              # GameState、共享类型、开发检查入口
│   │   ├── config/            # 属性、成长、技能与时序平衡
│   │   ├── assets/            # Asset Manifest 与碰撞外观配置
│   │   ├── animations/        # 状态到动画片段的映射
│   │   ├── world/             # MapDefinition 数据与 WorldView
│   │   └── view/              # Effects、DebugView
│   └── ui/                    # DOM HUD 与 CSS
├── tests/                     # 战斗窗口、生命、经验、掉落与检查点测试
├── docs/                      # 原始需求、设计、实现计划与代码审查
└── SPRITE_REPLACEMENT_GUIDE.md
```

## 核心系统

`GameplayScene` 负责实例连接、相机和销毁生命周期。`GameSession` 持有本局系统与模拟时钟，将输入、玩家、AI、战斗、掉落及进度更新串联起来。暂停时停止模拟时钟、物理、Tween、Scene Clock 与角色动画；命中反馈会产生很短的物理停顿。

`GameState` 不依赖 Phaser，负责生命、背包、升级、击杀与检查点。升级需求为 `100 + 60 × (当前等级 − 1)`；经验超过门槛会结转，并允许一次奖励连续升级。每级增加 18 最大生命和 5 攻击，恢复最多 36 HP。全部数值集中在 `src/game/config/balance.ts`。

`Player` 与 `Enemy` 根据状态决定动画。玩家死亡、受伤和动作锁定优先于移动；`DashController` 单独管理闪避时间与冷却。敌人通过巡逻边界、感知距离、攻击范围及前摇 / 有效期 / 后摇形成不同战斗行为。EnemyCoordinator 传播附近警戒，并将近战攻击承诺限制为两名；其他近战留在外围。巡逻范围由地图作者保证地面连续，不包含寻路或跨平台跳跃。

`AttackWindow` 是纯时间窗口及命中记录。`CombatSystem` 管理近战矩形、剑气、弩箭和独立地面冲击波，使用阵营过滤、独立判定及目标命中记录。弩箭和震地波有寿命、地形/结界碰撞；震地波在断崖结束。所有伤害只在 Active 生效；已发射的弹体不随普通受击消失，但阶段切换、死亡及重试会清理。击杀奖励另有本局 ID 记录防止重复发放，记录在敌人实体销毁后仍然保留。`lootRules` 只计算概率，`LootSystem` 负责场景物品及接触拾取。

`ACTOR_ASSETS` 管理图片地址、格式、帧尺寸、缩放、原点和物理碰撞盒。`ANIMATION_CONFIG` 管理帧范围或 Atlas 帧名、速度、循环和状态回退。实体只使用稳定资源键；更换 Sprite 不需要重写战斗逻辑。完整步骤见 [Sprite 替换指南](SPRITE_REPLACEMENT_GUIDE.md)。

`WorldView` 将地图数据渲染为静态平台、视差山景、灯祠和终点。`Hud` 只读取 `HudSnapshot` 并发出暂停 / 重启回调，保持游戏规则与 DOM 分离。画面以 1280 × 720 为基准，Canvas 和 HUD 同步适配 16:9 区域。


## Combat & Boss Update

普通命中只闪光和轻微位移，保持敌人的攻击承诺；普攻削减 22 韧性，剑气削减 42。韧性清空触发有限时间 Stagger，期间继续命中不会延长硬直；结束后恢复完整韧性。未破防时经过延迟，以每秒配置速率恢复韧性。所有计时使用可暂停的模拟时钟。

| 敌人 | HP / 伤害 / 速度 | 攻击行为 | 韧性 / 恢复延迟 / 每秒恢复 / 硬直 |
| --- | --- | --- | --- |
| 灰烬守卫 | 120 / 18 / 145 | 85px 挥斩；420 / 140 / 470ms；1080ms 冷却 | 60 / 1400ms / 22 / 600ms |
| 追魂客 | 88 / 16 / 205 | 200px 内蓄力突刺；350 / 250 / 480ms；1300ms 冷却；800px/s 位移 | 45 / 1200ms / 20 / 550ms |
| 玄甲守卫 | 190 / 25 / 90 | 120px 重斩；700 / 180 / 750ms；1900ms 冷却，强击退 | 150 / 1800ms / 35 / 700ms |
| 烬弩手 | 78 / 15 / 120 | 理想距离350px，近身后退；430ms 瞄准，400px/s 弩箭，1900ms 冷却 | 45 / 1500ms / 20 / 650ms |
| 镇关鬼将 · 玄骸 | 1000 / 21–31 / 135 | 独立 BossController、距离加权选招、禁止同招连续三次 | 300 / 2200ms / 50 / 800ms |

表中三段时序依次为前摇 / 有效期 / 后摇。追魂客的 200px 是突进触发距离，移动中的刀刃判定为 65px。敌人参数集中于 `balance.ts`，Boss 招式集中于 `boss.ts`，不依赖 Sprite 文件路径。

玄骸在 65% 和 30% HP 进入第二、第三阶段，每次切换有 850ms 安全过渡。第一阶段使用横斩和突进；第二阶段加入震地波与二连斩；第三阶段提高移动速度约14%、减少技能间隔18%、增加突进速度15%，加入三段鬼影连斩。伤害不翻倍。最后一斩后留出 1150ms 反击窗口。

| 招式 | 读取与应对 | 基础时序与伤害 |
| --- | --- | --- |
| 横斩 | 前方地面范围预警，后退或 Dash 穿身 | 420 / 150 / 520ms，22伤害 |
| 突进斩 | 方向箭头，锁定朝向后直线突进 | 560 / 260 / 750ms，27伤害，610px/s |
| 震地斩 | 双向地面预警；跃起或 Dash 躲独立冲击波 | 720ms 蓄力、820ms 后摇，29伤害，波速360px/s |
| 二连斩 | 第一刀后仍有第二次前摇，勿提前抢攻 | 420ms→第一刀21；300ms→第二刀26；740ms后摇 |
| 鬼影连斩 | 三次沿锁定方向位移，有分段预警 | 680 / 260 / 260ms前摇；24 / 24 / 31伤害；1150ms最终后摇 |

Boss 死亡奖励 350 修为、90–130 铜钱和一份药品，金币和药品必掉。`boss-drop` Scene 事件预留装备奖励接入；`combat-audio` 事件预留音效。当前仍无正式音频。

建议先观察一轮招式，避开有效期，再利用后摇出剑。连续按 J 会把自己锁在攻击动作里；Dash 有冷却，不能连续无敌。画面中的前摇、箭头和颜色只是消费 AI 公布的 cue，替换正式动画时无需重写行为层。

## 增加敌人

仅添加现有敌人的实例时，在 `src/game/world/map.ts` 的 `enemies` 中添加一个唯一 ID：

```ts
{ id: 'road-extra', type: 'basic', x: 3450, y: 535,
  patrolLeft: 3380, patrolRight: 3530 }
```

创建新类型时，在 `types.ts` 的 `EnemySpawn.type` 联合类型和 `balance.ts` 的 `ENEMIES` 类型中增加名称，例如 `armored`，再添加完整 `EnemyConfig`。可以展开现有配置，只覆盖 HP、伤害、移速、奖励、掉落或攻击时序。复用 `enemy-basic` 时无需新增美术；使用新资源键时，同时增加 `ACTOR_ASSETS` 与 `ANIMATION_CONFIG` 条目。地图生成实体时已经按 `spawn.type` 读取配置。

普通变体设置 `elite: false`。终点由 BossEncounter 的 defeated 状态开放，普通敌人的 elite 标记不负责关卡通关。`EnemyConfig.scale` 会乘在 Manifest 的 `appearance.scale` 上。新增敌人应检查其最终世界碰撞盒能否通过平台下方，巡逻边界不要跨过断桥；地图中的实体 ID 必须唯一。

## 增加技能

调整现有剑气只需修改 `balance.ts` 中的 `SKILLS.swordWave`。同类剑气可以复用 `CombatSystem.projectile(source, skill, damage)`，其 `SkillConfig` 包含冷却、前摇、后摇、伤害倍率、速度、寿命和判定尺寸。

添加第二个可选技能，需要把配置加入 `SKILLS`，在 `InputIntent` / `InputController` 中接入新的输入意图，并在 `Player` 中保存该技能自己的冷却与施放分支。之后扩展 `HudSnapshot` 与 `Hud` 的技能展示。动画可先复用 `Skill` 状态；新动作类型再扩展状态和动画映射。当前只接入一个技能槽，因此仅增加配置不会自动生成新按键或 HUD 图标。范围爆发、召唤等不同机制可新增独立模块，由施放分支调用。

## 增加地图

复制 `src/game/world/map.ts`，导出新的 `MapDefinition`，包含尺寸、出生点、检查点、终点、平台、敌人和区域名称。平台坐标是矩形左上角；演员的出生坐标是 Sprite 原点位置。随后在 `GameplayScene` 中将 `DEMO_MAP` 的引用统一换成新地图。

同高度古道地图可以直接复用 `WorldView`。当前装饰、灯柱与相机按地面 Y=596、视口高度 720 设计，跌落判定在 `GameSession.updateProgress()` 使用 Y=830；若新地图改变纵向布局，应同步调整这些位置和相机范围。两个检查点已支持；地图切换及 Tiled 导入尚未实现，但可以通过生成同一 `MapDefinition` 接入平台和敌人系统。

## 调试与验证

F1 可查看玩家 / 敌人物理矩形、敌人感知和攻击圆、攻击有效窗口、实体状态、韧性、警戒、Boss 阶段/技能和 FPS。开发服务器还提供只在开发模式加载的只读快照入口：

```js
window.__MISTBOUND__.inspect()
```

快照包括位置、速度、生命、状态、当前动画、攻击矩形与剩余物品。生产构建不加载这个开发模块。

`npm test` 覆盖普攻时序、单次命中、矩形相交、HP 边界、药品消耗、连续升级、掉落概率、检查点与重置规则。真实浏览器中还应验证移动 / 跳跃 / 闪避、敌人追击与攻击、击杀与拾取、死亡重生、暂停恢复、窗口缩放及完整通关；纯规则测试无法替代物理和画面检查。静态审查过程记录在 [docs/CODE_REVIEW.md](docs/CODE_REVIEW.md)。

已经执行的浏览器测试与修复证据见 [PLAYTEST_REPORT.md](PLAYTEST_REPORT.md)，截图和可机器读取的结果保存在 `output/playwright/`。复测可执行：

```bash
# 本机 macOS 已安装 Chrome 时会自动使用它；其他环境先安装测试浏览器
npx playwright install chromium
npm run playtest
# 仅运行指定场景，或者打开可见浏览器
npm run playtest -- controls combat
npm run playtest -- --headed
```

浏览器测试使用独立会话，不访问个人浏览器资料。`controls`、`combat`、`edgecases`、`boss`、`difficulty` 使用开发检查入口创建可重复的局部场景；`difficulty` 在起始布置之后只读当前前摇信息并使用真实键盘，比较站撸与合理操作；`journey` 只通过真实键盘输入完成全地图，不修改角色属性或位置。生产构建不包含该检查入口。可以通过 `PLAYTEST_URL` 指定已运行的开发服务，通过 `PLAYWRIGHT_CHANNEL=chrome` 明确使用 Chrome。

## 当前范围

本版没有存档、音频、触屏控件、手柄适配、技能树、法力、装备或多地图切换。刷新浏览器会重开一局。当前仅键盘输入；`InputSource` 为以后接入手柄预留了统一接口。素材是可替换占位资源，后续可以沿现有边界增加正式动画、战斗动作和地图内容。
