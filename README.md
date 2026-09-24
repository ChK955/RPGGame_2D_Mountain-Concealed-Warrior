# 雾隐 · 青石村 / MISTBOUND v0.3

可运行的 Phaser 2D 横版动作 RPG Demo。新游戏从青石村开始：与沈伯交谈并完成训练，向柳娘购入药品，经山门挑战沉月山林的玄骸；带着成长和战利品回村后，雾隐古道及新商品开放。击败魇猿并归村，即完成第二章。第三道山门保留为锁定的后续入口。

## 运行

需要 Node.js 22 或 24、npm。工程使用 Phaser 3.90、TypeScript 5.7 和 Vite 6。

```bash
npm ci
npm run dev
```

打开 <http://localhost:5177/>。`npm run build` 会先进行 TypeScript 检查，再生成静态产物到 `dist/`。`npm test` 运行规则测试；`npm run playtest` 自动启动开发服务器并运行 Chrome/Chromium 浏览器测试。macOS 会优先使用已安装的 Chrome；其他环境可先运行 `npx playwright install chromium`。自动化 JSON 和截图写入本地 `output/playwright/`。

刷新页面会开始新游戏。本版的世界状态可序列化，但尚未接入本地存档或存档槽。

## 操作与流程

| 按键 | 功能 |
| --- | --- |
| A / D 或 ← / → | 移动 |
| Space | 跳跃；对话中进入下一句 |
| J | 普通攻击 |
| K | 剑气技能，冷却 4 秒 |
| Shift | 闪避，冷却 1.2 秒，起始 160 毫秒无敌 |
| Q | 消耗回春散恢复 55 HP，满血时不消耗 |
| E | 与最近的 NPC、商店、山门或归村出口交互；对话中进入下一句 |
| Esc | 关闭当前对话 / 商店；无模态时暂停或继续 |
| F1 | 显示调试信息与判定范围 |

在村庄先与沈伯交谈，依次完成移动、跳跃、J 命中木桩、K 剑气命中木桩、Shift 闪避，再返回沈伯领取首关通行奖励。柳娘初始出售回春散；玄骸首通后开放护身符与磨刃石。每次最多携带 5 份回春散，永久升级只能购买一次。

第一关沿用 v0.2 的 7200px 地图、12 名敌人（包括玄骸）、三阶段 Boss、断桥、Poise、残灯和关前检查点。击败玄骸后等待约 3.5 秒，走到出口按 E 归村。第二关雾隐古道为 5600px，包含四个区域、三处短断桥、高低平台、远程敌人、三个可预判的落石点、强化精英与独立 Boss「赤目山魈 · 魇猿」。落石先出现地面阴影，再造成一次伤害；可以跑开、跳跃或闪避。魇猿使用近身挥击、锁定落点的跃起震砸、投石，以及第二阶段的狂啸震地。

敌人有明确前摇、有效期和破绽。近战/剑气通过同一战斗判定解决；韧性归零时会短暂硬直。残灯恢复生命、把药品补足至至少三份并记录重生点。死亡后在最近的残灯重生，角色等级、经验、金币、背包、永久升级和世界解锁不会丢失。

## 工程结构

`BootScene` 只加载资源并创建共享 `GameState`，然后进入 `VillageScene`。村庄拥有安全地图、教学、统一 E 交互、对话、商店和三个山门。`GameplayScene` 是薄接线层，依据 `LevelDefinition` 将对应地图和落石配置交给同一个 `GameSession`；没有复制玩家、敌人、战斗或 HUD 实现。`WorldFlow` 统一处理淡出与场景切换。

`GameState` 不包含 Phaser 对象，集中保存角色属性、世界进度、购买记录和当前返回点，并提供 `serialize()`。它存放在 Phaser Registry，场景往返时使用同一个实例。`completeTutorial()` 与 `clearLevel()` 在首次完成时发放一次性奖励，重玩关卡仍可获得正常击杀经验和掉落。当前地图局内击杀、检查点和时钟会在重新进入该关卡时重置。

| 位置 | 职责 |
| --- | --- |
| `src/game/scenes/` | Boot、Village、共享 Gameplay Scene |
| `src/game/world/` | 第一关与第二关纯地图数据、关卡定义、地形表现 |
| `src/game/systems/` | GameSession、WorldFlow、教程、交互、对话、商店、落石、Boss 场地 |
| `src/game/data/` | GameState、对白和商品配置、共享类型 |
| `src/game/entities/`、`ai/`、`combat/` | 玩家、普通敌人、两名 Boss 的行为和统一攻击判定 |
| `src/ui/` | 战斗 HUD、村庄 HUD 与 DOM 模态界面 |
| `src/game/assets/manifest.ts` | 稳定资源键与占位素材映射 |

新增关卡时定义 `MapDefinition` 和 `LevelDefinition` 并在 `levels.ts` 注册；现有 `GameplayScene` 与 `GameSession` 会复用战斗流程。替换正式 Sprite 时使用资源清单里的稳定 key 和 `animationConfig.ts`，无需改变进度、对话、商店、AI 或战斗规则。完整替换步骤见 [Sprite 替换指南](SPRITE_REPLACEMENT_GUIDE.md)。v0.3 架构与扩展边界见 [设计文档](docs/V03_VILLAGE_CHAPTER2_DESIGN.md)。

## 验证与范围

```bash
npm test
npm run build
npm run playtest
# 单独执行完整新世界旅程
npm run playtest -- v03
```

完整 `v03` 浏览器剧本从村庄用真实键鼠操作：完成教学、购物、经山门进入两关、触发落石、挑战两个 Boss、两次归村并确认第三山门仍锁定。旧版控制、战斗、边界、Boss 与难度套件将第一关设为隔离测试夹具，以继续验证原有功能。测试结果、截图和已知问题记录在 [PLAYTEST_REPORT.md](PLAYTEST_REPORT.md)。

本版使用原创程序化占位素材，来源见 [美术说明](public/assets/ART_LICENSE.txt)。尚无音频、正式角色美术、装备栏、技能树、复杂任务、多存档或触屏操作。键盘是当前正式输入方式。
