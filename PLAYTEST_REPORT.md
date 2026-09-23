# Game Studio Playtest — 雾隐 · 残灯古道

> 本报告正文记录的是 2026-09-15 的 v0.1 验证结果，不代表当前 v0.2 已通过全部验收。2026-09-24 的上传快照已通过 65 项单元测试和生产构建；v0.2 难度测试仍有失败，最新状态见 [项目状态](docs/PROJECT_STATUS.md)。`output/` 是本地生成的测试证据目录，不随 Git 提交；下方截图链接需要本地已有对应文件或重新运行测试。

日期：2026-09-15。依据 Game Studio 的 game-playtest 工作流，使用真实 Chromium/Chrome、键盘输入、开发态状态快照、生产包和截图交叉检查。源码审查见 [CODE_REVIEW](docs/CODE_REVIEW.md)，响应式详细记录见 [RESPONSIVE_QA](docs/RESPONSIVE_QA.md)。

## 已发现并修复

| 问题 | 证据与原因 | 修复与复测 |
| --- | --- | --- |
| 重开关卡报错，游戏停止 | 浏览器实际点击 Restart，`StaticPhysicsGroup.clear` 访问已被 Phaser 清理的 children | WorldView 使用幂等的 `destroy(true,true)`；连续重开三次通过，生产包重开也单独检查 |
| 极短点击漏掉跳跃或出招 | 自动化 keydown/keyup 同帧结束后，`JustDown` 已被 Phaser Key.onUp 清除 | InputController 保存按下事件至消费；零延迟点击跳跃、J/K/Shift/ESC/F1 的操作测试通过 |
| 暂停时角色动画仍然播放 | Phaser Sprite 动画与 Scene Clock 分离，单停物理/时钟不足 | 同步暂停/恢复 AnimationState；暂停前后敌人位置、模拟时钟、动画帧完全相同 |
| 死亡时 ESC 隐藏了继续菜单 | 死亡覆盖层优先级高于暂停，复活计时被冻结但没有可见按钮 | 暂停优先于死亡提示；死亡中暂停、继续、按检查点复活通过 |
| 低平台可能卡住敌人 | 原净空 68px，而普通敌人身体高度 69px | 低平台上移到 Y496，净空变为 78px；通关和巡逻快照中未发现卡入地形 |
| 无 Idle 过渡时连续攻击动画不重播 | 动画只比较 key，第二次同名 Attack 可能停在旧末帧 | 新动作显式请求动画重播；构造无 Idle 过渡的浏览器回归测试通过 |
| 竖屏 HUD 有小数像素误差 | 390×844 窗口中 clientHeight 将 219.375 截成 219 | 使用实际浮点边界缩放；四种尺寸画布、HUD 根节点和 HUD 内容边界一致 |
| 死亡实体只隐藏，未移除 | 生命周期审查发现仍留在更新列表 | 淡出后销毁并移出集合；敌人移除后 F1 调试和状态快照仍正常 |

## 自动验证结果

- `npm test`：18 项纯规则测试通过，覆盖伤害有效期、单次命中、矩形相交、HP、药品、连续升级、奖励、掉落与检查点。
- 浏览器 controls：20 项通过；combat：19 项通过；edgecases：5 项通过。合计 44 项行为检查。
- 完整旅程：只用 A/D/Space/J/K/Shift/Q 输入，跨越三处断桥、激活检查点、击败全部 12 名敌人（包括精英）并抵达终点。首次记录约 40 秒，0 次死亡，最终等级 4；这是熟知地图的自动化路线，不能等同于初次人工游玩时长。
- 完整旅程及局部场景：未记录运行时错误、资源 404 或其他失败请求。
- `npm run build`：TypeScript 与 Vite 生产构建成功。
- 生产包独立浏览器：确认开发调试入口未输出，移动、跳跃、技能 HUD、暂停重开正常，HP 重置到 120/120；无运行时错误或失败资源请求。
- `npm audit --omit=dev`：0 vulnerabilities。

combat/edgecases 为隔离行为，会通过仅开发态的工具入口设置起始位置、生命或经验；伤害、移动、菜单和重生依旧执行真实实现。掉落概率由注入随机数的纯规则测试验证，浏览器另测生成后接触拾取。完整 journey 不使用位置、生命或经验修改，也不通过直接扣血击杀。

## 窗口和视觉检查

1280×720、800×600、390×844、1920×1080 四种浏览器窗口均维持 16:9 游戏区域。扩展后的暂停/Controls 菜单没有裁切；持久 HUD 位于边缘，战斗中心保持空白。竖屏按比例缩小并上下留黑，因此文字较小；本版是键盘 Demo，不提供触屏控制。

已查看出生区、战斗、精英、通关、调试以及桌面/竖屏菜单截图。状态动画和 Sprite 朝向与操作相符。普通敌人巡逻边界留在连续地面上；左、右地图边界及坠落死亡均有实际浏览器检查。

## 复测与证据

```bash
npm test
npm run build
npm run playtest
```

测试运行器为 `scripts/run-playtest.mjs`，局部场景为 `scripts/playtest-*.js`。需要 Chromium；macOS 上也可自动使用已安装的 Chrome。自动化截图和 JSON 报告保存在 `output/playwright/`。

- [出生区](output/playwright/01-initial.png)
- [暂停菜单](output/playwright/02-paused.png)
- [F1 碰撞调试](output/playwright/03-debug.png)
- [战斗](output/playwright/04-combat.png)
- [检查点](output/playwright/05-checkpoint.png)
- [死亡提示](output/playwright/06-death.png)
- [精英区域](output/playwright/07-elite.png)
- [通关画面](output/playwright/08-complete.png)
- [生产包](output/playwright/11-production.png)

## 后续阶段

正式角色美术、更多关卡、战斗难度与人工游玩时长调优、音频、存档、装备、技能树、手柄和触屏适配尚未实现。当前关卡为单条短流程原型；自动化已证明能完整游玩，但没有将“首次游玩数分钟”作为经过人工验证的时长承诺。
