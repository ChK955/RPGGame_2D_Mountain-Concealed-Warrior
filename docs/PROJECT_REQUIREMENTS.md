# 项目目标

请使用已经安装的 Game Studio 插件，从零开始创建并完成一个可以实际运行和游玩的 2D 横版动作 RPG Demo。

不要只给我方案、示例代码或教程。

请直接在当前项目目录中创建完整工程、安装依赖、编写代码、创建必要素材、运行项目、打开游戏进行实际试玩和测试，并持续修复发现的问题，直到得到一个稳定、可玩的 Demo。

这是一个长期迭代项目。

当前版本的目标不是制作大量内容，而是建立一个架构清晰、方便扩展、方便以后替换人物 Sprite Sheet、攻击动画、敌人动画、地图素材和 UI 的 RPG 游戏骨架。

---

# Game Studio 工作流

请优先按照 Game Studio 推荐的 2D 游戏开发路线实现。

使用 Game Studio 中合适的专业能力，包括：

phaser-2d-game
game-ui-frontend
sprite-pipeline
game-playtest

如果 Game Studio 当前提供了更新或更合适的专用 Skill，可以自行选择。

不要使用 React、Vue 等额外前端框架，除非确实必要。

---

# 技术栈

游戏类型：

2D 横版动作 RPG / Action RPG。

核心技术栈：

Phaser
TypeScript
Vite
HTML + CSS DOM HUD

使用 Node.js/npm 管理项目。

使用当前 Game Studio 与 Phaser 官方工具链兼容的稳定 Phaser 版本，不要为了追求最新版本而破坏插件现有工作流。

如果需要从头创建 Phaser 工程，优先使用 Phaser 官方推荐的 Vite/TypeScript 工程结构。

物理系统优先使用 Phaser Arcade Physics。

该 Demo 不需要复杂刚体、关节或真实物理模拟，因此不要无意义引入 Matter.js。

---

# 游戏画面与整体风格

制作一个 2D 横版动作 RPG 原型。

世界氛围可以采用：

暗色东方幻想 / 武侠 / 玄幻遗迹风格。

但当前版本不要花费大量时间制作高质量美术。

优先保证：

游戏能够玩。

战斗逻辑完整。

代码架构清晰。

动画系统方便替换。

素材组织规范。

后续可以快速迭代。

当前可以使用简单原创占位角色、几何图形、简单 Sprite、简单粒子和程序化背景完成视觉表现。

不要使用存在版权风险的游戏角色或直接复制其他商业游戏素材。

---

# 游戏分辨率和摄像机

设计基准分辨率使用：

1280 × 720。

游戏需要能够适应浏览器窗口大小变化。

保持 16:9 游戏区域。

使用横版 Side View 摄像机。

摄像机平滑跟随玩家。

设置合理的地图边界。

摄像机不要突然跳动。

在玩家快速移动时保持良好可读性。

可以加入非常轻微的攻击震屏，但不要影响操作。

---

# Demo 地图

制作一个完整的小型横版地图。

地图应该至少能够让玩家连续游玩几分钟，而不是一个只有一块平台的技术测试房间。

地图包含：

玩家出生区域。

基础平台区域。

简单高低差。

至少一个需要跳跃通过的位置。

普通敌人战斗区域。

一个补给或者检查点区域。

一个稍强敌人或者小型精英怪区域。

终点区域。

暂时不要求大型 Tilemap 编辑器工程。

如果程序生成或者简单 Tilemap 更适合当前 Demo，可以自行选择。

但地图系统必须方便以后替换为正式 Tilemap。

---

# 玩家角色

实现 Player 实体。

玩家需要拥有独立状态和清晰状态切换。

至少支持：

Idle

Run

Jump

Fall

Attack

Skill

Hurt

Death

玩家角色需要支持朝左和朝右。

不要为左右方向分别制作完全不同的代码。

允许通过 flipX 或合理的动画资源配置控制朝向。

---

# 玩家操作

键盘操作：

A / D：左右移动

Space：跳跃

J：普通攻击

K：技能攻击

Shift：闪避或者短距离 Dash

Q：使用生命药水

ESC：暂停菜单

同时保留输入系统扩展接口，以后可以增加手柄支持。

不要直接在 GameplayScene 中到处读取键盘状态。

建立独立 Input Controller / Input System，将输入意图发送给玩家系统。

---

# 玩家移动

玩家需要拥有：

正常横向移动。

加速度或者适当移动平滑。

地面检测。

跳跃。

空中下落。

不能无限空中跳跃。

移动过程中可以正确切换 Idle / Run / Jump / Fall 动画。

玩家受到攻击时可以短暂进入 Hurt 状态。

玩家死亡后暂时禁止控制。

---

# 普通攻击

J 键执行基础近战攻击。

攻击过程中生成独立 Hitbox。

不要直接使用玩家 Sprite 本体作为攻击判定。

Hitbox 需要：

只在攻击有效帧或者有效时间窗口内启用。

出现在角色面对方向。

只对敌人造成一次伤害。

攻击结束后自动销毁或者禁用。

攻击具有轻微 Hit Stop 或视觉反馈。

敌人受到攻击时：

扣除 HP。

播放 Hurt 状态。

产生轻微击退。

短暂无敌或者避免单次攻击重复伤害。

显示简单受击特效。

死亡时进入 Death 状态。

---

# 技能攻击

K 键实现一个简单技能。

技能可以是：

向前斩出一道剑气。

剑气拥有独立 Projectile / Hitbox。

具有比普通攻击更高的伤害。

设置简单冷却时间。

HUD 显示技能冷却状态。

当前版本不需要复杂技能树。

但是技能系统需要设计成以后可以增加：

多个技能。

技能等级。

Mana / Energy。

技能冷却。

技能数据配置。

---

# Dash

Shift 实现短距离闪避。

Dash 期间：

角色快速向当前方向移动。

有明确冷却。

不能无限连续触发。

可以给予非常短的无敌时间。

状态需要独立。

不要把 Dash 逻辑全部塞进 Player update()。

---

# 玩家属性

建立独立 Player Stats 数据。

至少包括：

Max HP

Current HP

Attack Damage

Move Speed

Jump Force

Level

Experience

Gold

Potion Count

这些数值不要散落硬编码在不同 Scene 中。

统一放入配置或者 Stats 数据结构。

---

# RPG 成长系统

实现一个最小可运行 RPG 成长循环。

击杀敌人获得 Experience。

Experience 达到要求后升级。

升级后：

Level +1。

恢复一定生命值。

Max HP 小幅增加。

Attack Damage 小幅增加。

HUD 给出升级反馈。

经验升级公式放在独立配置或者函数中，方便以后修改。

---

# 敌人

制作至少一种近战敌人。

敌人使用有限状态机或者类似结构管理行为。

至少包含：

Idle

Patrol

Chase

Attack

Hurt

Death

敌人在远离玩家时巡逻。

玩家进入感知范围后进入 Chase。

进入攻击范围后停止追击并攻击。

玩家离开较远距离后重新巡逻。

敌人不能每一帧造成攻击伤害。

攻击必须有：

Attack Windup。

Active Hit Window。

Attack Recovery。

攻击冷却。

敌人死亡后：

停止 AI。

关闭碰撞。

播放死亡效果。

给予 Experience。

概率掉落 Gold 或生命药水。

然后延迟销毁实体。

---

# 精英敌人

地图后段加入一个简单精英敌人。

可以复用普通敌人的系统。

但拥有：

更高 HP。

更高伤害。

稍大的攻击范围。

不同视觉颜色或者尺寸。

更高经验奖励。

不需要制作复杂 Boss AI。

这个敌人的目的只是验证敌人系统可以通过配置快速产生不同类型。

---

# 生命药水与掉落

敌人有概率掉落生命药水。

玩家接触药水后增加 Potion Count。

按 Q 使用。

使用后恢复一定 HP。

不能超过 Max HP。

如果已经满血，可以禁止使用。

掉落物系统不要和 Enemy 类强绑定。

建立独立 Loot / Drop 系统或者明确的数据边界。

---

# Checkpoint 与死亡

地图中设置一个简单 Checkpoint。

玩家接触后记录当前重生位置。

玩家 HP <= 0 时：

进入 Death。

播放死亡表现。

暂时停止操作。

短暂延迟后从最近 Checkpoint 重生。

恢复 HP。

不要刷新整个浏览器页面实现重生。

---

# HUD

HUD 使用 DOM + HTML/CSS 覆盖在 Phaser Canvas 上，而不是把所有复杂 UI 都绘制到 Canvas 里面。

HUD 至少显示：

HP Bar。

HP 数值。

Level。

Experience Bar。

Gold。

Potion Count。

Skill Cooldown。

控制提示。

HUD 风格保持简洁。

不要制作类似后台管理系统 Dashboard 的 UI。

UI 不能遮挡主要战斗区域。

---

# 暂停菜单

按 ESC 打开简单暂停菜单。

显示：

Resume。

Restart。

Controls。

关闭暂停菜单后恢复游戏。

暂停状态下不要继续执行战斗 AI。

---

# 非常重要：动画架构

这个项目未来会由我自己替换正式 Sprite Sheet。

因此动画系统必须高度可替换。

禁止在 Player.ts、Enemy.ts 或 GameplayScene.ts 中到处直接硬编码：

Sprite Sheet 路径。

frameWidth。

frameHeight。

Animation Frame Index。

frameRate。

repeat。

动画资源必须通过独立 Animation Configuration / Asset Manifest 管理。

例如建立类似：

src/game/animations/

src/game/config/

src/game/assets/

的结构。

玩家动画至少建立：

player-idle

player-run

player-jump

player-fall

player-attack

player-skill

player-hurt

player-death

敌人动画至少建立：

enemy-idle

enemy-run

enemy-attack

enemy-hurt

enemy-death

以后我应该只需要：

替换 PNG Sprite Sheet。

修改资源配置。

修改 frameWidth / frameHeight。

修改帧范围。

必要时调整角色碰撞盒。

而不需要重写 Player、Enemy 或 Combat System。

---

# Sprite Sheet 兼容

动画系统需要同时方便支持：

标准等尺寸 Sprite Sheet。

Texture Atlas + JSON。

当前版本可以选择一种主要格式。

但是架构不要锁死到单一人物图片路径。

统一通过 Asset Key 引用游戏资源。

例如：

player-main

enemy-basic

enemy-elite

不要让游戏逻辑直接依赖：

assets/player/player01-final-v3.png

这种具体文件名。

---

# 动画状态控制

动画播放必须由 Gameplay State 驱动。

例如：

velocityX != 0 且 grounded → Run。

velocityX == 0 且 grounded → Idle。

velocityY < 0 → Jump。

velocityY > 0 且 airborne → Fall。

attacking → Attack。

hurt → Hurt。

dead → Death。

Attack、Hurt、Death 等高优先级动画不能被 Idle / Run 每一帧强制覆盖。

建立合理的动画优先级。

---

# 碰撞盒

Sprite 视觉尺寸和 Physics Body 尺寸必须解耦。

以后替换不同尺寸 Sprite Sheet 时，我应该能够简单调整：

Body Width。

Body Height。

Body Offset。

Scale。

Origin。

不要依赖整张 Sprite 图片作为碰撞区域。

攻击 Hitbox 同样需要独立。

---

# 项目架构

请保持 Phaser Scene 尽可能薄。

不要把整个游戏全部写进 GameplayScene.update()。

游戏规则和状态尽可能拆分为独立模块。

推荐按照类似概念组织代码：

Scenes

Entities

Components

Systems

Combat

AI

Input

Animations

Assets

Config

UI

Data

可以根据实际实现优化目录。

但必须保持职责清晰。

Gameplay Scene 主要负责：

场景初始化。

将系统与 Phaser 对象连接起来。

摄像机。

地图。

场景生命周期。

不要让 Scene 成为 God Object。

---

# Game State

核心游戏状态不要完全依赖 Phaser Sprite 对象本身保存。

Player Stats、经验、物品、游戏进度等状态与 Renderer/View 尽可能解耦。

这样以后：

替换 Sprite。

替换 Scene。

增加存档。

增加新地图。

都不会破坏核心数据。

---

# 配置驱动

尽可能将以下内容配置化：

玩家属性。

敌人属性。

经验奖励。

掉落概率。

技能伤害。

技能冷却。

移动速度。

攻击范围。

动画。

不要为了所谓“数据驱动”过度设计复杂框架。

保持简单清晰即可。

---

# 视觉反馈

加入简单但明显的动作反馈。

例如：

攻击时轻微 Hit Stop。

敌人受击短暂闪烁。

轻微 Camera Shake。

简单 Slash Effect。

伤害数字。

死亡淡出。

升级提示。

不要为了视觉效果影响操作清晰度。

---

# Debug 功能

加入一个简单 Debug 模式。

例如通过 F1 开关。

Debug 模式显示：

Player Physics Body。

Attack Hitbox。

Enemy Detection Range。

Enemy Attack Range。

FPS。

Player State。

Enemy State。

这样以后我修改 Sprite Sheet 和碰撞盒时可以快速检查问题。

---

# 音频

当前版本音频不是最高优先级。

如果方便，可以加入简单原创或无版权风险的占位音效。

不要因为寻找音频素材阻碍 Demo 完成。

游戏必须能够在没有音频资源的情况下正常运行。

---

# README

创建完整 README.md。

README 至少说明：

项目技术栈。

安装方式。

启动方式。

Build 方式。

按键操作。

目录结构。

核心系统说明。

以后如何增加新敌人。

以后如何增加新技能。

以后如何增加新地图。

---

# Sprite 替换说明

额外创建：

SPRITE_REPLACEMENT_GUIDE.md

专门告诉我以后如何把自己的角色 Sprite Sheet 替换进去。

文档必须给出具体流程。

包括：

Sprite Sheet 应该放在哪个目录。

如何修改 Asset Manifest。

如何修改 frameWidth / frameHeight。

如何修改 animation frame range。

如何调整 frameRate。

如何调整 scale。

如何调整 origin。

如何调整 Physics Body。

如何调整 Body Offset。

如何调整 Attack Hitbox。

如何检查左右翻转。

如何使用 Debug 模式检查碰撞盒。

如何替换玩家动画而不修改战斗代码。

给出一个实际示例。

---

# 代码质量要求

使用 TypeScript 类型系统。

避免 any。

不要在一个文件中堆积几千行代码。

不要过度工程化。

不要为了设计模式而设计模式。

优先保持：

可读。

可维护。

可扩展。

容易修改。

使用明确命名。

必要位置添加简洁注释。

---

# 实际执行要求

这是最重要的一部分。

不要在完成代码生成后就停止。

完成第一版后：

安装所有依赖。

启动开发服务器。

实际打开游戏。

实际试玩。

测试玩家移动。

测试跳跃。

测试攻击。

测试 Skill。

测试 Dash。

测试敌人巡逻。

测试敌人追击。

测试敌人攻击。

测试玩家受伤。

测试敌人死亡。

测试掉落。

测试经验。

测试升级。

测试药水。

测试 Checkpoint。

测试死亡重生。

测试暂停菜单。

测试 HUD。

测试不同浏览器窗口尺寸。

检查 Browser Console。

检查 TypeScript Error。

检查 Runtime Error。

发现问题后直接修改。

然后再次运行和测试。

重复这个流程。

---

# Build 验证

最终必须执行生产构建。

确认：

npm run build

可以成功完成。

不要留下 TypeScript 编译错误。

不要留下明显 Console Error。

不要留下资源 404。

不要留下无法启动的脚本。

---

# Game Studio Playtest

代码基本完成后，请调用 Game Studio 的 Playtest / Browser QA 能力进行一次完整检查。

重点检查：

角色是否会卡进地形。

角色能否离开地图范围。

攻击是否重复造成异常伤害。

敌人是否可能永久卡死。

死亡状态是否仍然可以攻击。

暂停状态下敌人是否继续运动。

动画是否出现快速闪烁。

Run / Idle 是否覆盖 Attack 动画。

Sprite 朝向是否正确。

HUD 是否遮挡画面。

不同窗口尺寸是否导致 UI 错位。

发现问题后继续修改。

不要只是生成测试报告。

能够修复的问题请直接修复，然后重新测试。

---

# 最终完成标准

只有满足以下条件才认为第一阶段完成：

可以使用 npm 命令启动游戏。

进入游戏后可以直接游玩。

玩家可以正常移动、跳跃和战斗。

至少一种普通敌人拥有基本 AI。

存在一个简单精英敌人。

HP 和伤害系统正常。

存在经验与升级系统。

存在掉落和生命药水。

存在 Checkpoint 和死亡重生。

存在 HUD。

存在暂停菜单。

动画结构可替换。

Sprite Sheet 不和游戏逻辑强耦合。

Debug 模式可以检查碰撞盒。

npm run build 成功。

Browser Console 没有明显错误。

README.md 完整。

SPRITE_REPLACEMENT_GUIDE.md 完整。

---

# 工作方式

请自主完成整个任务。

遇到普通技术决策时自行选择合理方案，不需要因为细节不断询问我。

如果某个非核心功能明显会拖慢整个 Demo，可以选择更简单的实现。

优先级始终是：

可玩性 > 稳定性 > 良好架构 > 可扩展性 > 视觉精致程度。

不要只告诉我“下一步你可以做什么”。

请直接做。

完成后向我汇报：

最终实现了哪些系统。

项目目录结构。

关键架构设计。

如何启动游戏。

如何 Build。

如何替换 Sprite Sheet。

自动 Playtest 发现了哪些问题。

你已经修复了哪些问题。

还有哪些内容属于下一阶段，而不是本阶段。
