# RPG Demo v0.3 — 青石村与第二章设计

日期：2026-09-24。依据现有 Phaser 3.90 / TypeScript / Vite 代码。此文档记录 v0.3 的实现边界和接口。

## 升级前基线与实现决定

现有 `GameplayScene` 很薄：地图来自 `MapDefinition`，`GameSession` 创建角色、敌人、CombatSystem、HUD 外部通知；`GameState` 保存战斗属性、检查点与击杀，但每次 Session 构造都会重建。`Boss` 和 `BossController` 只适用于玄骸。`InputController` 无 E。资源通过 Manifest；浏览器测试由 Playwright 驱动。v0.2 浏览器难度与完整通关验收尚未完成，v0.3 不声称这些已通过。

采取一个长期存在的 `GameState` 实例作为本局唯一数据源，通过 Phaser Registry 在 Scene 间传递。它保存既有 stats、世界进度、已购商品和当前回村点，提供可序列化纯数据快照；地图内检查点、存活敌人、临时计时器属于 Session，进入关卡时初始化。`GameplayScene` 保持唯一战斗 Scene，依据 `levelId` 读取 `LevelDefinition`；复用 Player、Enemy、CombatSystem、LootSystem、Hud、DebugView。`VillageScene` 独立、安全，复用 Player 移动与攻击动画、InputController 和攻击窗口来训练木桩，使用独立的精简 DOM HUD，不生成战斗敌人。

## 世界流程

新游戏进入青石村。沈伯对话开启六步训练：行走、跳跃、J 命中木桩、K 命中木桩、Shift、再次与沈伯对话。完成一次性授予铜钱与药，打开第一山门。第一关即现有地图，显示名称“沉月山林”，Boss 仍为玄骸。击杀后更新 `level1Cleared` 与 `level2Unlocked`，首次额外奖励一次；3.5 秒后在原出口激活 `[E] 归村`。回村保持属性和进度，在归村落点出现，村庄灯笼、沈伯台词、柳娘商品和第二门变化。第二关“雾隐古道”以新 `MapDefinition` 提供约 5600px 的雾林、断桥、高低平台、检查点、落石、魇猿竞技场。第二 Boss 首次击败后解锁“第二章完成”村庄状态，归村出口同样等待 3.5 秒。第三门只显示“前路尚未开放”。重进任何已开启关卡会生成新敌人/Boss，保留玩家属性与一次性奖励标记。

## 数据与场景

`GameState.world` 是纯 JSON 可序列化对象：`tutorialComplete`, `level1Unlocked`, `level1Cleared`, `level2Unlocked`, `level2Cleared`, `level1FirstClearRewardClaimed`, `level2FirstClearRewardClaimed`, `merchantUnlocks`, `purchasedItems`, `currentReturnPoint`。`GameState` 增加 `completeTutorial()`、`clearLevel(id)`、`enterLevel(spawn)`、`serialize()`；`clearLevel` 幂等地颁发首次通关奖励，普通击杀奖励仍由既有 `grantKill` 每次发放。后续 SaveSystem 序列化这份数据即可，不额外建立并行的全局玩家状态。

`LEVELS` 对象管理 `level1` 和 `level2`，每项包含 `id`, `title`, `map`, `bossName`, `hazards`, `returnDelay`；首次通关奖励在 `WorldRules` 配置。`GameplayScene.init(data)` 选择定义；`GameSession` 接受已有 GameState、对应地图与关卡选项，不持有跨 Scene 静态变量。场景路由 `WorldFlow` 控制淡出后调用 `scene.start`，关卡和 Village 通过纯进度决定门是否可用。Scene shutdown 销毁 input/HUD/DOM/listener/timers，Registry 中只留纯 GameState。

## 村庄交互和 UI

`InputIntent.interact` 由 E 键单点事件提供。`InteractionSystem` 接受一组 `{interactionId, x, interactionRange, promptText, canInteract, interact}`，按距离选最近可交互对象，返回提示文字与触发结果。沈伯、柳娘、三座门均注册统一接口，不自行监听键盘。锁门仍有“锁定”提示，E 触发短通知。门切换先禁用操作、相机淡出，随后开始目标 Scene。

`TutorialController` 是纯阶段机，消费本帧移动距离、有效跳跃、命中木桩的攻击种类、Dash、沈伯对话完成事件。木桩是可重复受击的训练目标，但不会攻击玩家。`DialogueData` 根据 `GameState.world` 选取沈伯和柳娘的 3～6 句短句；`DialogueSystem` 只持有当前 speaker/line/next/close，可附带完成教程的回调。`ShopData` 是商品配置表，`ShopSystem.purchase` 集中验证解锁、库存上限、购买次数和金币，成功后原子更新 GameState；初期药水，第一关后一次性 HP+15 护身符和攻击+3 磨刃石。

`VillageOverlay` 在 DOM 显示简短对话、商店卡片、互动提示与区域标题；商店支持鼠标。统一 modal 状态为 `gameplay | dialogue | shop | paused`：modal 打开时输入只交给对应 UI，不更新 Player/Combat；ESC 根据当前状态只关闭一层，防止同一按键打开 Pause。基础 HUD 显示 HP/等级/经验/金币/药，Village CSS 隐藏 Boss 与战斗 Debug（F1 除外）。区域标题淡入 1～2 秒且不遮挡操作。

## 第二关战斗

普通敌人沿用 v0.2 四种配置，以间距、地形、远程后排形成新组合。高台弩手扩大垂直感知，并在前摇开始时锁定目标发射斜向箭，箭矢轨迹与预警线一致。落石 Hazard 有确定触发区域、650～730ms 地面阴影、独立矩形伤害窗口和一击记录；移动或 Dash 可躲，Debug 可看其命中框。避免随机即时伤害。魇猿复用 Enemy/Poise/CombatSystem 与 BossEncounter；另有独立 `ApeController`，而不是复制玄骸控制器。公共接口包含 `engage/update/resetEncounter/controller.phase/currentSkill/transitioning`。招式是短挥、锁定位置后跳砸、远程投石、第二阶段怒吼震地波；50% HP 以下安全过渡，速度 +15%、间隔略短，最终有可利用的后摇。Boss HUD 与 Debug 只消费公共接口。

## 测试与边界

规则测试：六步教程、对话分支、商店拒绝负币/超上限/重复永久购买、门解锁、一次性奖励和重进关卡属性持久性、落石前摇与独立命中、魇猿阶段切换。浏览器测试：整段真实键盘和鼠标旅程、场景反复进入、DOM 与事件无重复、Boss 与落石截图、暂停/模态冲突、1280×720/1920×1080/小窗口、无 console error/404。最终按 `npm test`、`npm run build`、`npm run playtest` 验收，并保留 v0.2 尚未完成的难度调优记录。
