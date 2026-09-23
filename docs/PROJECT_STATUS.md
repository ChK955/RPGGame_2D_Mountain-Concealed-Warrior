# 项目状态 — 2026-09-24

本次提交用于保存现有 Phaser RPG 工程。v0.2 Combat & Boss Update 仍在开发与验证中，不作为已完成的发行版本。

## 已进入工程的功能

- 保留 Phaser 3.90、TypeScript、Vite、薄 GameplayScene 和独立 GameSession。
- 四种普通敌人：基础近战、突进、重甲、远程弩手。
- Poise / Stagger、近战协同和独立弹体判定。
- 三阶段 Boss、五种招式、竞技场封锁、Boss 前检查点、Boss HUD 与调试显示。
- Playwright 的 Boss 生命周期、难度对比与完整旅程测试脚本。

这些代码已经存在，不意味着所有游戏体验和浏览器验收都已通过。

## 本次上传前重新运行

| 检查 | 结果 |
| --- | --- |
| `npm test` | 7 个测试文件，65 项通过 |
| `npm run build` | TypeScript 检查与 Vite 生产构建通过 |

本次上传未重新运行完整 `npm run playtest`。旧版 `PLAYTEST_REPORT.md` 中的通关记录属于 v0.1。

## 尚未完成

- 最近一次 v0.2 难度 A 测试未通过：站立连续普攻击败两名基础敌人，仅受到 18 伤害，未达到“大量受伤”的目标。需要继续检查协同行为、攻击节奏和韧性平衡，不能将当前难度标记为验收完成。
- 同次难度测试在 A 失败后终止，B / C / D 的成功结果尚未建立。
- v0.2 完整键盘通关、Boss 战时长、全套视觉截图和最终浏览器回归仍需完成。
- 最终参数、浏览器问题修复及实测数据需要在后续更新 `README.md` 和 `PLAYTEST_REPORT.md`。

## 克隆后运行

```bash
npm ci
npm run dev
```

访问开发服务显示的地址，默认 http://localhost:5177 。生产产物可以通过 `npm run build` 重新生成。

源码、原始素材、依赖锁文件、测试脚本和工程文档均包含在仓库中。`node_modules/`、`dist/`、`output/`、浏览器缓存、日志和本地环境变量文件由 `.gitignore` 排除。测试截图和 JSON 报告由浏览器测试生成到本地 `output/playwright/`。
