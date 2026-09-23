请继续直接修改当前已经完成的 Phaser RPG Demo 工程。

不要重新创建项目。

先完整阅读现有项目代码、README、PLAYTEST_REPORT、现有自动化测试和当前游戏架构，在现有实现基础上进行升级。

项目当前已经拥有：

- Phaser 3.90 + TypeScript + Vite
- Player
- 普通敌人
- 精英敌人
- CombatSystem
- Attack Hitbox
- Dash
- Sword Wave
- HP
- Experience / Level
- Loot
- Potion
- Checkpoint
- HUD
- Pause
- Debug
- Playwright Playtest

请保留现有良好架构和已有功能，不要推倒重写。

本次目标是制作：

# RPG Demo v0.2 — Combat & Boss Update

核心目标：

让现在偏简单的战斗升级成真正需要玩家观察攻击前摇、移动、Dash、拉开距离和使用技能才能稳定获胜的横版动作 RPG 战斗。

优先级：

战斗体验 > Boss 战 > 敌人 AI > 敌人种类 > 战斗反馈 > 新内容数量。

不要通过单纯堆叠几倍 HP 来制造难度。

难度应该主要来自：

敌人行为差异。

攻击节奏。

攻击范围。

组合攻击。

远程压力。

抗硬直。

Boss Phase。

空间控制。

玩家判断。

同时保证攻击有清晰 Telegraph，避免无法反应的“阴人攻击”。

---

# 1. 保留现有技术架构

继续使用：

Phaser 3.90

TypeScript

Vite

Arcade Physics

现有 CombatSystem

现有 GameSession

现有 Asset Manifest

现有 Animation Config

现有 Debug / Playtest 架构。

不要迁移 Phaser 版本。

不要引入新的大型框架。

GameplayScene 继续保持薄层。

敌人 AI、Boss AI 和战斗规则不能全部塞进 GameplayScene。

---

# 2. 首先调整普通敌人基础难度

当前普通敌人难度偏低。

请重新平衡基础敌人“灰烬守卫”。

建议从目前参数：

HP 85
Damage 14
Speed 115
Detection 330
Attack Windup 520ms
Cooldown 1400ms

调整到大约：

HP：110～125

Damage：18

Speed：145

Detection Range：400～430

Leash Range：600 左右

Attack Range：80～90

Windup：380～450ms

Active：120～150ms

Recovery：430～520ms

Cooldown：1000～1150ms

实际数值可以根据 Playtest 微调。

要求：

普通敌人依然不能秒杀玩家。

玩家正常使用攻击、技能与 Dash 时可以稳定击杀。

但如果玩家站着不停按 J 硬拼两个敌人，应明显受到惩罚。

---

# 3. 修复“连续攻击即可无限压制敌人”的问题

重点检查当前 Enemy.receiveDamage()、Hurt、lockedUntil 等逻辑。

现在敌人每次受伤容易被攻击打断。

这可能导致玩家持续普通攻击将敌人无限压制。

增加一个简单但清晰的：

# Poise / Stagger System

为敌人加入：

maxPoise

currentPoise

poiseDamage

poiseRecoveryDelay

poiseRecoveryRate

staggerDuration

普通攻击减少一定 Poise。

剑气减少较多 Poise。

只有 Poise 被打空时敌人才进入真正的 Stagger / 长硬直。

普通受击：

可以播放短暂 Hurt Feedback。

可以轻微击退。

但不能永远打断已经进入 Active Attack 的敌人。

普通敌人可以较容易被打出硬直。

重甲敌人较难。

Boss 最难。

Boss 绝对不能被玩家连续 J 无限锁死。

Poise 数值也必须放入配置文件，而不是散落硬编码。

---

# 4. 将单一普通敌人升级成至少三种敌人

当前地图大量重复 basic enemy。

保持现有 Sprite Asset 可复用。

暂时不需要等待正式美术。

不同敌人可以暂时通过：

scale

tint

weapon effect

outline

speed

攻击特效

来区分。

以后我会使用正式 Sprite 替换。

增加：

## Enemy A：灰烬守卫

定位：

基础近战兵。

行为：

Patrol
Chase
Slash
Hurt
Death

属于最容易处理的基础敌人。

主要负责让玩家学习闪避与攻击时机。

---

## Enemy B：追魂客

定位：

快速近战敌人。

特点：

HP 比普通守卫低。

移动速度明显更快。

Detection Range 更大。

会快速靠近玩家。

攻击距离略短。

拥有一个短距离突进攻击。

建议：

HP 80～95

Damage 15～18

Speed 190～220

Dash / Lunge Attack Range 170～220

突进攻击必须有大约 300～400ms Telegraph。

攻击之前：

身体压低。

颜色或武器闪光。

或者脚下出现简单方向提示。

让玩家可以使用 Dash 躲开。

不要瞬发。

---

## Enemy C：玄甲守卫

定位：

重甲高韧性敌人。

特点：

移动慢。

HP 高。

Poise 高。

普通攻击不容易打出硬直。

攻击范围更大。

伤害更高。

拥有重击。

建议：

HP 170～210

Damage 22～26

Speed 80～100

Attack Range 105～125

较长 Telegraph。

重击命中后有明显击退。

玩家应该利用：

拉距离

剑气

Dash

攻击后摇

来处理。

不要把它做成单纯血牛。

---

# 5. 如果当前架构允许，再增加一个远程敌人

增加：

## Enemy D：烬弩手 / 符弩手

这是本次更新的可选但高优先级内容。

定位：

远程压力。

行为：

保持距离。

玩家太远时接近。

玩家进入理想距离后停止。

发射 Projectile。

玩家靠太近时尝试后退。

建议：

HP 70～85

Damage 14～17

Preferred Range：280～420

Projectile Speed：350～450

Fire Cooldown：1600～2200ms

射击必须有 Telegraph。

例如：

弩/法器亮起。

出现短暂瞄准线。

300～500ms 后才真正发射。

Projectile 可以被 Dash 无敌躲避。

不要使用必中攻击。

---

# 6. 增加简单敌人协同

不要让所有敌人同时重叠在玩家身体上疯狂攻击。

实现轻量敌人协同。

目标：

多个敌人一起发现玩家后会形成战斗压力。

但是不要形成不可读的围殴。

可以采用简单规则：

附近敌人发现战斗后进入 Alert。

最多约 2 名近战敌人同时真正贴身攻击。

其他近战敌人保持一定距离。

远程敌人在后排输出。

重甲兵缓慢逼近。

不要实现过度复杂的群体 AI。

保持系统简单、可测试。

---

# 7. 普通地图重新配置敌人组合

不要继续使用 11 个完全相同 basic enemy。

重新配置当前 7200px 地图。

前段：

主要出现单只灰烬守卫。

让玩家熟悉战斗。

中段：

灰烬守卫 + 追魂客。

Checkpoint 前后：

加入玄甲守卫。

后段：

可以出现：

玄甲守卫 + 追魂客

或者：

灰烬守卫 + 远程敌人。

不要把怪物单纯堆成一团。

不同区域形成不同战斗问题。

---

# 8. 把当前“gate-warden 精英怪”正式升级为真正 Boss

当前：

gate-warden

不要再只是 elite enemy。

将其升级成独立 Boss：

# 镇关鬼将 · 玄骸

Boss 应拥有独立 Boss AI / Boss Controller 或清晰的 Boss 行为层。

不要把大量 Boss-specific if 判断全部塞入普通 Enemy.ts。

普通 Enemy 与 Boss 可以共享：

Actor

CombatSystem

Damage

Hitbox

Animation

Physics

等基础能力。

但是 Boss Phase 和技能逻辑必须拥有独立结构。

---

# 9. Boss Arena

玩家进入最终区域后：

触发 Boss Encounter。

关闭左右 Boss Arena Boundary。

禁止玩家直接跑到终点。

显示 Boss 名称。

Boss HP Bar 从屏幕顶部出现。

音乐可以暂时没有。

使用简单视觉提示进入战斗：

轻微 Camera Zoom / Shake。

Boss 名称淡入。

竞技场边缘出现阻挡或视觉结界。

Boss 死亡后：

解除边界。

Boss HP Bar 淡出。

打开终点。

显示：

“镇关鬼将已败”

然后允许玩家完成关卡。

Checkpoint 必须放在 Boss 区域之前。

死亡后可以直接从 Boss 前 Checkpoint 重试。

---

# 10. Boss 基础属性

目标 Boss 战斗时长：

熟练玩家大约 45～90 秒。

不要设计成几分钟血牛战。

建议基础值：

Max HP：

900～1100。

不要超过太多。

Movement Speed：

120～160，根据阶段调整。

Poise：

远高于普通敌人。

Boss 受到普通攻击：

HP 正常减少。

但不会每刀进入长时间 Hurt。

只有打空 Poise 或特殊条件才产生真正 Stagger。

Boss Damage 大约：

轻攻击：20～24

重攻击：26～32

强技能：28～35

避免满血一击秒杀。

难度来自攻击组合，而不是超高伤害。

---

# 11. Boss Phase 1：100% ～ 65% HP

Boss 主要教学基础招式。

至少拥有：

## Attack 1：横斩

中距离普通斩击。

Telegraph：

350～450ms。

Active：

120～180ms。

Recovery：

400～550ms。

玩家可以：

后退。

跳跃。

Dash 穿过。

---

## Attack 2：突进斩

Boss 与玩家距离较远时使用。

流程：

短暂停顿。

面朝玩家。

身体/武器发光。

然后快速向玩家方向突进。

攻击结束有明显 Recovery。

玩家成功闪避后可以反击。

不要实时追踪玩家直到命中。

突进开始时锁定方向。

---

# 12. Boss Phase 2：65% ～ 30% HP

进入 Phase 2 时：

Boss 暂停约 0.7～1 秒。

产生明显视觉反馈。

Camera 轻微 Shake。

Boss 周围产生简单冲击视觉。

禁止在阶段切换期间瞬间伤害玩家。

Phase 2 增加：

## Attack 3：震地斩 / Shockwave

Boss 进行明显蓄力。

大约：

600～800ms Telegraph。

随后武器砸地。

在左右地面生成冲击波。

冲击波沿地面移动。

玩家可以：

跳跃躲避。

Dash。

拉开距离。

Shockwave 必须作为独立攻击对象。

不能只是检测“玩家是否距离 Boss 小于 X”。

这样 Debug 模式可以显示它的 Hitbox。

---

## Attack 4：二连斩

第一刀。

短暂停顿。

第二刀。

第二刀攻击范围稍大。

要求：

玩家如果看到第一刀后直接无脑攻击，可能被第二刀命中。

但如果观察动作，可以安全闪避。

---

# 13. Boss Phase 3：30% ～ 0%

进入：

Enrage。

不要简单 Damage ×2。

应该改变：

移动速度小幅提高。

攻击冷却缩短约 15～20%。

技能组合概率提高。

突进距离增加。

Recovery 略缩短。

加入最终技能：

## Attack 5：鬼影连斩

建议流程：

明显 Telegraph。

Boss 锁定玩家当前方向。

快速进行 2～3 次位移斩。

每次位移之间存在极短但可读间隔。

最后一次攻击产生较大的 Recovery。

玩家正确连续 Dash / 调整位置后获得明显输出窗口。

不要做随机瞬移直接扣血。

所有攻击必须能够视觉读取。

---

# 14. Boss 行为选择

不要按固定：

Attack1 → Attack2 → Attack3 → Attack1

机械循环。

根据距离与 Phase 选择技能。

例如：

近距离：

横斩 / 二连斩。

中距离：

突进斩。

远距离：

突进或接近。

Phase 2+：

偶尔 Shockwave。

Phase 3：

提高 Combo 概率。

但是避免完全 Random。

增加：

技能最近使用记录。

避免连续三次重复同一招。

让 Boss 看起来像在“选择动作”。

---

# 15. Boss Telegraph 系统

这是本次更新的重点。

困难不意味着看不清攻击。

每一种危险攻击必须具有：

动作前摇。

身体姿势。

武器闪光。

地面范围提示。

音效接口。

或者颜色变化。

当前没有正式 Sprite 时，可以先使用：

Tint。

Graphics。

Line。

Circle。

Rectangle。

Particle。

Tween。

Camera FX。

制作占位 Telegraph。

以后更换正式 Sprite / VFX 时不能重写 Boss AI。

---

# 16. 攻击优先级与公平性

Boss 不能：

玩家倒地马上再次攻击造成无限连死。

连续技能完全不给恢复时间。

在玩家死亡时继续攻击。

暂停时继续计时。

Boss Phase 切换时偷偷造成伤害。

攻击 Telegraph 尚未完成就提前生成 Hitbox。

确保：

Windup

Active

Recovery

三个阶段严格存在。

只有 Active 时间可以造成伤害。

---

# 17. 玩家暂时不要大幅增强

本次主要加强敌人。

不要为了抵消怪物变强同时把玩家伤害翻倍。

保留目前：

普通攻击。

Sword Wave。

Dash。

Potion。

Upgrade。

可以适度调整数值。

但不能导致 Boss 再次被几秒秒杀。

玩家 Dash Invulnerability 必须继续作为重要防御手段。

---

# 18. 增加 Boss HUD

普通 HUD 保留。

Boss Encounter 开始后：

屏幕顶部中央显示：

镇关鬼将 · 玄骸

Boss HP Bar。

当前阶段不必直接写“Phase 2”，可以通过视觉变化表达。

Boss HP Bar：

进入战斗淡入。

Boss 死亡淡出。

不遮挡核心战斗区域。

---

# 19. 战斗反馈升级

利用现有 Effects 系统增加：

普通攻击命中：

轻微 Hit Stop。

敌人硬直：

稍明显反馈。

重击命中：

稍强 Camera Shake。

Boss Phase 切换：

短暂 Camera Shake / Flash。

Boss 重击：

地面冲击视觉。

Poise Break：

独立视觉反馈。

不要每次攻击都剧烈震屏。

不要造成视觉疲劳。

---

# 20. Debug 模式升级

现有 F1 Debug 保留。

增加显示：

Enemy Detection Range。

Attack Range。

Attack Hitbox。

Projectile Hitbox。

Shockwave Hitbox。

Enemy State。

Boss State。

Boss Phase。

Boss 当前技能。

Boss Poise。

普通敌人 Poise。

Alert 状态。

这样方便后续继续调 AI。

---

# 21. 配置驱动

扩展当前 balance.ts / types.ts。

不要把所有数字写进 Enemy.ts 或 Boss.ts。

建议支持类似：

EnemyArchetype

Basic

Fast

Heavy

Ranged

Boss

配置字段包括：

HP

Damage

Speed

Detection

Attack Range

Cooldown

Poise

Poise Recovery

Attack Pattern

Projectile

Experience

Gold

Drop Rate

保持简单。

不要做成庞大 ECS。

---

# 22. 地图终局设计

当前最后区域重新设计为：

沉月关
↓
Boss 前 Checkpoint
↓
短暂安静区域
↓
进入山门
↓
Boss Arena 锁定
↓
镇关鬼将 · 玄骸
↓
Boss Death
↓
Arena Unlock
↓
通关出口

让 Boss 明确成为这一版 Demo 的最终高潮。

---

# 23. 奖励调整

因为敌人难度增加：

适当提高：

Experience。

Gold。

精英与 Boss 奖励。

Boss 死亡给予大量经验。

可以直接保证至少一次升级或明显成长。

Boss 100% 掉落：

Gold。

Potion。

并预留：

Boss Drop

接口。

以后可以加入装备。

当前暂时不实现完整装备系统。

---

# 24. 自动测试升级

保留当前：

npm test

npm run build

npm run playtest

并增加对应测试。

至少验证：

普通敌人 Attack Telegraph 正常。

Hitbox 只在 Active Window 生效。

连续攻击不能无限锁死重甲敌人。

Poise 降低。

Poise 恢复。

Poise Break 触发 Stagger。

快速敌人的 Lunge 不会瞬发。

Projectile 可以正常命中玩家。

Projectile 超时销毁。

Boss Phase 1 → 2 正常。

Boss Phase 2 → 3 正常。

Boss 死亡后 Arena 解锁。

Boss 死亡后无法继续攻击。

Boss 战暂停后所有技能正确冻结。

死亡重生后 Boss 正确 Reset。

Checkpoint 正确。

Shockwave Hitbox 正常。

Boss 攻击无法重复多次异常扣血。

---

# 25. 新增难度 Playtest

原来的完整自动旅程：

击败全部 12 个敌人。

0 Death。

约 40 秒。

说明当前难度太低。

升级后增加新的 Combat Difficulty Playtest。

至少建立下面几个场景。

## Test A：Face Tank

玩家站在两个近战敌人附近。

只连续普通攻击。

不 Dash。

不主动躲技能。

结果应该：

受到大量伤害。

不应该轻松无伤击杀两名敌人。

---

## Test B：Skillful Combat

玩家合理使用：

移动。

普通攻击。

剑气。

Dash。

应该能够稳定击杀同样敌人。

验证：

战斗困难但公平。

---

## Test C：Boss Button Mash

面对 Boss：

玩家只贴身连续普通攻击。

不躲技能。

预期：

不能击败 Boss。

玩家应该先死亡。

这用于防止 Boss 被 J 键无限压制。

---

## Test D：Boss Proper Play

使用：

保持距离。

观察 Telegraph。

Dash。

Sword Wave。

攻击 Recovery Window。

应该可以击败 Boss。

不要求绝对无伤。

---

# 26. 不要为了让自动脚本通过而降低难度

这是非常重要的要求。

如果现有自动通关脚本因为 Boss 变难无法通关：

不要直接把 Boss 削弱。

应该升级自动 Playtest 行为。

让 Playtest 学会：

躲避 Telegraph。

Dash。

拉开距离。

利用 Recovery。

使用 Skill。

必要时喝药。

我们的目标是测试：

游戏是否可以通过合理操作通关。

不是测试：

AI 能不能站着按 J 通关。

---

# 27. Playtest 视觉检查

Game Studio Playtest 时必须截图检查：

新普通敌人。

快速敌人突进 Telegraph。

重甲敌人。

远程 Projectile。

Poise Break。

Boss Encounter 开始。

Boss Phase 1。

Boss Phase 2 Shockwave。

Boss Phase 3。

Boss Death。

Boss HP HUD。

Debug Hitboxes。

确认：

攻击范围和特效一致。

看得到 Telegraph。

没有无形 Hitbox。

Boss 不会卡平台。

Shockwave 不会穿过不合理地形。

Projectile 不会无限存在。

HUD 不遮挡 Boss。

---

# 28. 当前阶段不要做的内容

不要在本轮扩展：

大型装备系统。

技能树。

多张地图。

剧情对话系统。

任务系统。

商店。

复杂存档。

大量正式美术。

多人游戏。

这些留到下一阶段。

本轮把所有注意力集中在：

战斗。

敌人。

Boss。

Game Feel。

---

# 29. 美术兼容要求

当前继续使用已有占位 Sprite 即可。

Fast / Heavy / Ranged / Boss 可以临时通过：

Tint。

Scale。

Weapon Effect。

Outline。

简单 VFX。

区分。

不要因为缺少正式美术停止开发。

以后我会通过 FrameRonin / Sprite Sheet 替换正式角色和敌人动画。

因此：

Asset Manifest。

Animation Config。

Enemy Logic。

Boss Logic。

必须继续保持解耦。

---

# 30. 完成标准

只有满足下面条件才算本次升级结束：

普通敌人比当前版本明显更有威胁。

至少存在三种明显不同的敌人行为。

如果实现合理，加入远程敌人。

玩家不能靠连续 J 轻松压制所有敌人。

Poise / Stagger 系统正常。

镇关鬼将已经成为真正 Boss，而不是放大版普通怪。

Boss 至少拥有三个阶段。

Boss 至少拥有四种明显不同攻击。

包含 Shockwave 或类似区域控制技能。

Boss 拥有独立 HP HUD。

Boss Arena 正常锁定和解锁。

Boss 死亡流程正确。

Checkpoint 可以重试 Boss。

Dash 是 Boss 战的重要防御手段。

所有危险攻击都有 Telegraph。

F1 可以查看 Boss Debug 数据。

npm test 全部通过。

npm run build 成功。

npm run playtest 成功。

Browser Console 无明显 Error。

无资源 404。

新增 Playtest 截图。

更新 README.md。

更新 PLAYTEST_REPORT.md。

---

# 31. 工作方式

请直接执行，不要只给我升级方案。

先检查当前代码。

规划最小必要重构。

然后开始修改。

不要因为某个细节询问我。

普通技术决策请自行选择合理实现。

不要一次性推倒已有系统。

优先复用：

Actor

CombatSystem

AttackWindow

Effects

GameSession

GameState

DebugView

现有 Playwright 工具。

每完成一个核心系统就运行测试。

发现 Bug 直接修复。

完成全部系统后运行：

npm test

npm run build

npm run playtest

然后实际使用 Chromium / Playwright 完整打一遍游戏。

最后汇报：

1. 修改了哪些文件。
2. 新增了哪些敌人。
3. 每种敌人的行为区别。
4. Poise / Stagger 如何实现。
5. Boss 有哪些 Phase。
6. Boss 每个技能的行为。
7. 最终 Boss 参数。
8. 普通怪最终参数。
9. Playtest 中发现并修复的问题。
10. Boss 战测试结果。
11. 完整通关测试结果。
12. 当前仍然存在的问题。
13. 下一阶段最适合开发什么。

如果实际 Playtest 发现难度依然太低：

请继续调整 AI、攻击频率、Poise 或组合，而不是简单把 HP 无限提高。

如果难度过高：

优先增加 Telegraph 和 Recovery Window，而不是简单砍掉敌人机制。

最终目标是：

“有压力，但看得懂；会操作就能过，无脑站撸就会死。”