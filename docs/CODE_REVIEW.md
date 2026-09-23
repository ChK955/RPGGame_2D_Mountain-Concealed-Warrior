# 核心系统审查记录

审查范围：`entities`、`combat`、`systems`、`input`、`components`、`scenes`、`view`，并交叉检查地图、资源配置与 HUD。依据为 [PROJECT_REQUIREMENTS.md](PROJECT_REQUIREMENTS.md)。此记录区分源码确认与浏览器验证，不替代最终游玩报告。

## 已修复并核对源码

| 原问题 | 位置 | 原因与修复 |
| --- | --- | --- |
| 暂停时人物动画继续播放 | `src/game/systems/GameSession.ts:138` | 原先只暂停物理、Tween 与 Clock；Sprite 的 AnimationState 由独立 `preUpdate` 驱动。现已对全部演员显式调用 `anims.pause()` / `resume()`。 |
| 普通敌人无法完整通过部分低平台下方 | `src/game/world/map.ts:12`、`:14`、`:18` | 原平台底边 Y=528、地面 Y=596，仅有 68px 净高，普通敌人身体为 69px；涉及 `bridge-02` 与 `gate-02` 巡逻范围。现平台提高 10px，净高变为 78px。 |
| 死亡期间暂停隐藏恢复入口 | `src/ui/Hud.ts:147` | 原先 dead 优先于 paused，冻结重生时钟后仍显示“稍候重生”，没有 Resume 按钮。现优先级改为 completed → paused → dead，可访问暂停菜单。 |
| 无中间移动状态的连续攻击不重新播放动画 | `src/game/animations/animationConfig.ts:54`、`src/game/entities/Player.ts:57` | 原来只在动画键改变时播放；低帧率可能跳过动作锁定与冷却之间 20ms 的 Idle。现动画适配器接受显式 restart，玩家每次新普攻 / 技能使用 `animate(true)`，普通 update 保持不重播。 |
| 同一帧快速按下 / 松开时丢失输入 | `src/game/input/InputController.ts:19` | Key down 事件现在写入待采样集合，不依赖可能被同帧 keyup 清除的 JustDown；动作在 sample 中消费一次，reset 清空集合，销毁 Key 时移除事件监听。 |
| 重启时重复清空已经销毁的平台组 | `src/game/world/WorldView.ts:108` | 主任务浏览器验证发现 Scene shutdown 顺序可能先销毁 Group。现统一调用可重复执行的 `destroy(true,true)`，避免对已销毁 children 的 Group 再调用 clear。已核对 Phaser Group / GameObject 的销毁保护。 |
| 死亡敌人长期留在实体列表 | `src/game/systems/GameSession.ts:73`、`src/game/view/DebugView.ts:13` | 敌人淡出到 alpha=0 后倒序移除并销毁，后续战斗、特效与调试仅遍历剩余实体。调试标签先全部隐藏，再按照当前列表复用，避免残留旧敌人标签。 |

## 回归重点

上述修复均已核对源码，浏览器回归由主任务执行：暂停期间动画帧不变；死亡后立即暂停能看到菜单，继续后正常重生；普通敌人能通过低平台；25fps 左右连续按 J 时每个动作重新播放，且不会每帧重置；快速轻按仍触发一次动作；击杀并等待淡出后可继续战斗、开关 Debug、通关并反复重启。动画适配器的最小调用验证已由修复前的一次 `play()` / 不重启，变为显式开始两次动作时两次 `play()` / 正确重启；这不替代低帧率浏览器检查。

## 最终生命周期复查

源码复查未发现新增关键阻断问题。`GameSession` 只移除已经死亡且完全淡出的敌人；死亡时奖励已由 `rewarded` 集合记录，攻击源也已经取消。实体从列表移除后，`setPaused()`、重生、快照、特效与 Debug 都不会再访问其已销毁身体。Arcade 的遗留 Collider 会跳过无 body 的已销毁 Sprite，并在 Scene 关闭时统一释放。

`GameSession.ts:111` 与 `:149` 的精英判断检查“剩余精英是否都已死亡”；最后一名精英移除后数组为空，`every()` 仍为 true，山门会保持开启。这与本版只在死亡淡出后删除实体的流程一致。重启重新构造 GameSession、全部敌人、输入和 HUD；已移除演员不在再次清理列表，WorldView 的幂等销毁处理了 Phaser 已先执行清理的情况。Debug 标签数量按初始敌人总数分配，在当前仅减少实体的流程中足够；以后加入动态刷怪时需同步扩展标签分配。

## 已核对的规则与边界

- `AttackWindow` 仅在有效期允许命中，目标 ID 集合防止同次攻击重复伤害；矩形要求实际相交。
- `CombatSystem` 过滤己方、死亡目标与受伤 / 死亡攻击源；`GameSession.rewarded` 额外防止重复奖励。
- 玩家跳跃后清除离地宽限和输入缓冲；死亡分支在移动与施放之前返回。
- 暂停提前返回，停止 AI、攻击窗口、冷却与重生计时；重启通过 Scene 生命周期清理监听、HUD、演员和物品。
- 普通敌人巡逻 / 追击均受作者配置的巡逻边界约束；本版没有跨平台寻路。检查地图时需保证巡逻区地面连续并留出缩放后身体所需净高。

本次审查期间执行 `npm test`，结果为 **2 个测试文件、18 个测试通过**。这些是纯规则测试，不能证明动画、Arcade 碰撞与浏览器交互全部通过。未改动生产源码；修复与最终浏览器验证由主任务集成。
