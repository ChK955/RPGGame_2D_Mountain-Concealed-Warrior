# Game Studio Playtest — 雾隐 v0.3

日期：2026-09-24。以真实 Chrome/Chromium、键盘、鼠标、Phaser 开发态只读快照和截图验证青石村 → 沉月山林 → 归村 → 雾隐古道 → 归村的完整循环。测试程序在 `scripts/run-playtest.mjs`，结果和截图在本地 `output/playwright/`；该目录由 Git 忽略，克隆后可用 `npm run playtest` 再生成。

## 验证结果

| 检查 | 结果 |
| --- | --- |
| `npm test` | 14 个测试文件、95 项通过 |
| `npm run build` | TypeScript 类型检查与 Vite 生产构建通过 |
| 生产包预览 | 打开青石村并接受键盘移动，开发调试入口未打包；无 page error 或失败请求 |
| controls / combat / edgecases / boss | 20 / 19 / 6 / 14 项浏览器检查通过 |
| difficulty | 6 项对照检查通过：站立连按 J 会承受大量伤害，观察前摇并用技能与闪避可减少伤害、击败 Boss |
| journey | 使用真实键盘穿过完整第一关，击败玄骸并通过 E 归村 |
| ranged / ape-rock | 高台弩手能向地面射击；魇猿投石预警后按出手瞬间玩家位置决定斜向轨迹 |
| responsive / lifecycle | 1280×720、1920×1080、800×600、390×844 不裁切；两关各重复进入两次，HUD、村庄 UI 和按键监听各只有一份 |
| v03 | 真实键鼠完成新手教学、命中木桩、商店购买、两个 Boss、两次归村、第二章完成及第三门锁定，共 39 项检查 |
| 浏览器运行 | 无 page error，无 404 或其他失败资源请求 |

`v03` 剧本不修改角色属性、位置或敌人生命：通过实际移动、攻击、交互和购买完成双章节。局部 `controls`、`combat`、`edgecases`、`boss`、`difficulty`、`ranged`、`ape-rock`、`lifecycle` 使用开发态入口设置隔离场景；实际输入、伤害判定、场景生命周期仍由游戏代码执行。生产构建不包含该调试入口。

## 完整旅程实测

首次进入青石村，与沈伯交谈后完成移动、跳跃、J 普攻命中训练木桩、K 剑气命中木桩、Shift 闪避，再次对话领取 30 铜钱和 1 份回春散。向柳娘购买药，进入第一山门。第一关经普通敌人和残灯，击败玄骸的三个阶段；3.5 秒后在终点按 E 归村。世界旗标变为 `level1Cleared`、`level2Unlocked`，沈伯与柳娘对白改变，护身符和磨刃石出现在商店。购买护身符后进入雾隐古道，跨过断桥，遇到可预判落石与高台远程敌人，点亮残灯，击败魇猿的两阶段并归村。最终 `level2Cleared` 为真，沈伯对白再次变化，第三山门仍显示锁定。

场景往返时等级、经验、金币、药品、最大生命与攻击属性保持一致。永久商品购买记录和首通奖励标记也保留；关卡重进会重建当前地图敌人与检查点。第一关归村后的角色达到约 5 级，第二关归村后约 8 级；这是熟知地图的自动化路线，不代表初次人工游玩时长。

## 发现并修复

| 问题 | 修复与复测 |
| --- | --- |
| 村庄切关后黑屏，Scene shutdown 访问已销毁的 physics world | 移除关停时的恢复调用，由目的 Scene 在 `create()` 恢复物理；真实山门切关与重复进出通过 |
| 第二关首个桥面的下沿正压在起跳点上方，跳跃会撞桥底并坠入缺口 | 三处高桥都移到地面断边之后，保留断桥跳跃；键盘跳跃和完整路线通过 |
| 高台弩手无法感知地面玩家，水平箭也无法命中 | 为远程敌人单独扩大垂直感知、锁定前摇目标并发射斜向箭；独立浏览器夹具确认预警与实际伤害 |
| 商店关闭检查发生在 Scene 下一帧之前 | 浏览器剧本等待模态状态切换后再判断；Esc 只关闭商店，不额外打开暂停 |
| 旧版关卡测试仍假设游戏直接从 Gameplay 启动 | 添加测试专用 Level 1 入口；完整 `v03` 剧本仍从真实村庄开局 |
| 旧版旅程在归村出口开启前一直向右走，越过可交互距离 | 到终点附近停下，等待出口开放后按 E，确认返回村庄 |
| 旧版“站立 J 必死”断言不适用于已成长的角色 | 改为相同强敌组合下量化站立连按的受伤量，并与闪避打法对照；未改变现有战斗数值 |
| 村庄区域标题定时器可能在 Scene 销毁后继续运行 | 定时器加入 Overlay 的销毁清理集合；多次进出无残留 DOM 或监听 |

## 视觉与交互 QA

青石村的人物落在地面上，交互提示位于角色上方且不遮挡操作。商店为简短的卷轴式卡片，购买按钮根据金币和容量禁用；对话只覆盖屏幕中下部。两道可进入山门有光晕，锁门保留封印符号。第二关使用冷蓝雾、枯树和残桥，落石先出现地面阴影；魇猿的跳砸落点、狂啸方向和阶段变化均有提示。F1 在村庄显示 NPC 与山门半径，在关卡显示攻击、韧性、Boss 和落石判定。

四种窗口尺寸的 Canvas 与 HUD 同步缩放，没有横向溢出或弹窗裁切。390×844 竖屏会保持 16:9 游戏比例，因此文字明显变小；本版以键盘和横屏桌面为主要游玩方式。商店和对话仍可见、可关闭。当前使用可替换占位素材，无正式音频。

## 截图索引

- [村庄初入](output/playwright/v03-01-village-intro.png)、[沈伯对白](output/playwright/v03-02-elder-intro.png)、[训练木桩](output/playwright/v03-03-training-dummy.png)
- [初期商店](output/playwright/v03-07-shop-intro.png)、[第一山门](output/playwright/v03-08-level1-gate.png)
- [玄骸击败后归村](output/playwright/v03-10-village-changed.png)、[新增商品](output/playwright/v03-12-shop-unlocked.png)、[第二山门](output/playwright/v03-13-level2-gate.png)
- [落石前摇](output/playwright/v03-level2-falling-rock-warning.png)、[魇猿第一阶段](output/playwright/v03-level2-boss-phase-1.png)、[第二阶段](output/playwright/v03-level2-boss-phase-2.png)、[投石预警](output/playwright/v03-ape-rock-telegraph.png)
- [第二章归村](output/playwright/v03-17-chapter2-complete.png)、[第三山门锁定](output/playwright/v03-18-third-gate-locked.png)
- [高台弩手](output/playwright/v03-raised-archer-aim.png)、[村庄 F1](output/playwright/v03-village-debug.png)、[1920×1080 商店](output/playwright/v03-shop-1920x1080.png)
- [生产包村庄](output/playwright/v03-production-village.png)

## 当前边界

没有持久化存档 UI、音频、正式角色/场景美术、触屏适配、装备栏、技能树或第三章。旧版高等级角色站立连续攻击仍可能击败玄骸，但实测会承受显著更多伤害；更细的 Boss 平衡和首次人工游玩时长需下一轮调优。
