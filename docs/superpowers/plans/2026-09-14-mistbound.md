# Mistbound Implementation Plan

**Goal:** 当前目录交付稳定可玩的横版动作 RPG 骨架。
**Architecture:** 状态、输入、战斗、动画配置与 Phaser Scene 分离；DOM HUD 使用类型化快照。
**Tech Stack:** Phaser 3.90, TypeScript 5.7, Vite 6, Arcade Physics, Vitest.
**Spec:** ../specs/2026-09-14-mistbound.md

## 全局约束
1280×720，A/D/Space/J/K/Shift/Q/ESC/F1；无额外前端框架；原创占位素材；配置化动画；实际浏览器试玩与 npm run build。

## 工作顺序
- [ ] 数据与规则：config/balance.ts、data/GameState.ts，测试升级进度、生命边界、药水消耗、随机掉落。
- [ ] 美术与世界：assets/manifest.ts、animations/animationConfig.ts、world/map.ts、world/WorldView.ts、scripts/generate-assets.mjs；检查统一帧尺寸与左右翻转。
- [ ] UI：src/ui/Hud.ts、styles.css；消费 HudSnapshot，菜单回调暂停/恢复/重开。
- [ ] 操作与战斗：InputController、Player、Enemy、DashController、CombatSystem；有限攻击时间窗、命中去重、AI 前摇/有效期/后摇。
- [ ] 场景集成：BootScene、GameplayScene、GameSession，连接摄像机、地形、重生和通关；生产 TypeScript 检查。
- [ ] 浏览器验证：输入动作、完整通关、暂停冻结、死亡禁攻、掉落与升级、检查点、窗口变化，保存 output/playwright 截图和报告。
- [ ] 文档与复核：README.md、SPRITE_REPLACEMENT_GUIDE.md、PLAYTEST_REPORT.md；修复发现后再次执行 npm test 和 npm run build。

三个独立子任务并行负责数据、素材地图、UI，主任务实现战斗和集成。共享边界为 src/game/data/types.ts。测试用实际值和输入行为，不以画面截图替代规则检查。
