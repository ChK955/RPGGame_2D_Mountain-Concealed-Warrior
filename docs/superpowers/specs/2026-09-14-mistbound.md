# 雾隐 · 残灯古道 — 第一阶段设计

执行依据为 ../../PROJECT_REQUIREMENTS.md。用户已明确要求自主实现、运行和持续修复，不增加设计批准环节。

Phaser 3.90 + TypeScript + Vite + Arcade Physics，1280×720 自适应。当前官方模板已转 Phaser 4，本项目固定成熟的 Phaser 3 以匹配 Game Studio 的 2D 工作流。无需 React。

风格：青灰山雾、黑色石壁、玉色衣袍、暖金灯火；水墨剪影与原创程序化精灵。角色使用统一锚点的 PNG 帧表，manifest 同时支持 atlas。

一条约 6500–7500 px 的地图，出生、平台跳跃、断桥、普通敌人、补给检查点、精英和终点。敌人由配置产生，巡逻边界避免走入深渊。击杀获得经验与随机掉落，升级、喝药、灯台重生构成最小成长循环。

场景仅装配 WorldView / GameSession / DOM HUD。实体负责表现和身体，InputController 负责意图，独立 CombatSystem 管理一次命中的攻击窗口、Projectile 与伤害，DashController 管理冲刺。GameState 保存角色数值与进度。全部计时用暂停可冻结的模拟时间。

HUD 在边缘显示生命、经验、目标、技能和控制；中央留给战斗。ESC 暂停含继续、重开与操作说明；F1 调试显示碰撞、攻击和感知范围。

验收：生产构建、数值单测、真实浏览器移动/战斗/重生/通关/暂停/窗口尺寸测试以及截图与控制台检查。记录真实发现和修复，交付 README 与具体 Sprite 替换指南。
