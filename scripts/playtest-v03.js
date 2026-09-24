async (page, { makeDriver }) => {
  // Full journey: controls are real keyboard/mouse events. The dev bridge is read-only here.
  const checks = [], errors = [], failedRequests = [], milestones = [], screenshots = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`); });
  const inspect = () => page.evaluate(() => window.__MISTBOUND__?.inspect());
  const wait = ms => page.waitForTimeout(ms);
  const check = (name, pass, detail) => {
    checks.push({ name, pass, detail });
    if (!pass) throw new Error(`${name}: ${JSON.stringify(detail)}`);
  };
  const shot = async name => {
    const path = `output/playwright/v03-${name}.png`;
    await page.screenshot({ path });
    screenshots.push(path);
  };
  const driver = makeDriver(page);
  const started = Date.now();
  let last = null;

  async function villageAt(x, tolerance = 42, maxMs = 24000) {
    const until = Date.now() + maxMs;
    while (Date.now() < until) {
      const s = await inspect(); last = s;
      if (s?.scene !== 'Village' || s.modal !== 'gameplay') throw new Error(`Village movement interrupted: ${JSON.stringify(s?.scene ?? s?.modal)}`);
      const dx = x - s.player.x;
      if (Math.abs(dx) <= tolerance) {
        await driver.move('');
        await wait(150);
        return await inspect();
      }
      await driver.move(dx > 0 ? 'd' : 'a');
      await wait(60);
    }
    await driver.move('');
    throw new Error(`Could not reach village x=${x}; at ${last?.player?.x}`);
  }

  async function pressInteract() {
    await driver.move('');
    await driver.press('e');
    await wait(100);
    return await inspect();
  }

  async function finishDialogue() {
    for (let i = 0; i < 9; i++) {
      const s = await inspect(); last = s;
      if (s.modal !== 'dialogue') return s;
      await page.locator('[data-village-action="next"]').click();
      await wait(65);
    }
    throw new Error('Dialogue did not finish within nine lines');
  }

  async function buyWithMouse(id) {
    const button = page.locator(`button[data-item-id="${id}"]`);
    if (await button.count() !== 1) throw new Error(`Shop item ${id} is absent`);
    if (await button.isDisabled()) throw new Error(`Shop item ${id} is disabled: ${await button.textContent()}`);
    const box = await button.boundingBox();
    if (!box) throw new Error(`Shop item ${id} has no visible button`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await wait(120);
    return await inspect();
  }

  async function practice() {
    let s = await villageAt(625);
    check('elder is reachable', s.nearby?.id === 'elder' || s.nearby?.interactionId === 'elder', s.nearby);
    s = await pressInteract();
    check('first elder conversation opens', s.modal === 'dialogue' && s.dialogue?.speaker === '沈伯', s.dialogue);
    const dialogueX = s.player.x;
    await page.keyboard.down('d'); await driver.press('j', 'attack'); await wait(180); await page.keyboard.up('d');
    s = await inspect();
    check('dialogue blocks movement and attacks', Math.abs(s.player.x - dialogueX) < 1 && s.attacks.length === 0, { player: s.player, attacks: s.attacks });
    await shot('02-elder-intro');
    s = await finishDialogue();
    check('conversation starts movement training', s.tutorial?.stage === 'move', s.tutorial);
    s = await villageAt(850, 18);
    check('walking advances the training', s.tutorial?.stage === 'jump', s.tutorial);
    await driver.press('Space', 'jump');
    await page.waitForFunction(() => window.__MISTBOUND__.inspect()?.tutorial?.stage === 'normal-hit', { timeout: 4000 });
    await page.waitForFunction(() => window.__MISTBOUND__.inspect()?.player?.grounded, { timeout: 4000 });
    s = await villageAt(865, 18);
    // Arrival from the left must leave the sword facing the dummy.
    await driver.move('d'); await wait(75); await driver.move('');
    for (let tries = 0; tries < 5; tries++) {
      s = await inspect();
      if (s.tutorial.stage === 'skill-hit') break;
      await driver.press('j', 'attack'); await wait(520);
    }
    s = await inspect();
    check('J must actually hit the training dummy', s.tutorial.stage === 'skill-hit', { tutorial: s.tutorial, player: s.player });
    await shot('03-training-dummy');
    for (let tries = 0; tries < 4; tries++) {
      s = await inspect();
      if (s.tutorial.stage === 'dash') break;
      await driver.press('k', 'skill'); await wait(850);
    }
    s = await inspect();
    check('K sword wave must actually hit the dummy', s.tutorial.stage === 'dash', { tutorial: s.tutorial, player: s.player });
    await shot('04-training-wave');
    await driver.press('Shift', 'dash');
    await page.waitForFunction(() => window.__MISTBOUND__.inspect()?.tutorial?.stage === 'elder', { timeout: 4000 });
    s = await villageAt(625);
    s = await pressInteract();
    check('final elder conversation opens', s.modal === 'dialogue', s.dialogue);
    await shot('05-elder-finish');
    s = await finishDialogue();
    check('training completes and first gate unlocks', s.world.tutorialComplete && s.world.level1Unlocked && s.tutorial.stage === 'complete', { world: s.world, tutorial: s.tutorial });
    milestones.push({ event: 'tutorial-complete', gold: s.stats.gold, potions: s.stats.potionCount });
    await shot('06-first-gate-open');
    return s;
  }

  async function merchant(beforeLevel1) {
    let s = await villageAt(1370);
    s = await pressInteract();
    check('merchant conversation opens', s.modal === 'dialogue' && s.dialogue?.speaker === '柳娘', s.dialogue);
    s = await finishDialogue();
    check('merchant shop opens', s.modal === 'shop' && s.shop?.length >= 1, s.shop);
    const shopX = s.player.x;
    await page.keyboard.down('d'); await driver.press('j', 'attack'); await wait(180); await page.keyboard.up('d');
    s = await inspect();
    check('shop blocks movement and attacks', Math.abs(s.player.x - shopX) < 1 && s.attacks.length === 0, { player: s.player, attacks: s.attacks });
    await shot(beforeLevel1 ? '07-shop-intro' : '12-shop-unlocked');
    if (beforeLevel1) {
      check('intro shop carries only potion', s.shop.map(item => item.id).join() === 'potion', s.shop);
      const gold = s.stats.gold, potionCount = s.stats.potionCount;
      s = await buyWithMouse('potion');
      check('mouse purchase updates inventory and gold', s.stats.gold === gold - 25 && s.stats.potionCount === potionCount + 1, s.stats);
      milestones.push({ event: 'shop-potion', gold: s.stats.gold, potions: s.stats.potionCount });
    } else {
      check('first clear unlocks both permanent upgrades', s.shop.some(item => item.id === 'charm') && s.shop.some(item => item.id === 'sharpening'), s.shop);
      if (s.shop.find(item => item.id === 'charm')?.status?.ok) {
        const maxHp = s.stats.maxHp, gold = s.stats.gold;
        s = await buyWithMouse('charm');
        check('charm grants permanent health once', s.stats.maxHp === maxHp + 15 && s.stats.gold === gold - 140 && s.world.purchasedItems.includes('charm'), { stats: s.stats, world: s.world });
        milestones.push({ event: 'shop-charm', maxHp: s.stats.maxHp, gold: s.stats.gold });
      }
    }
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__MISTBOUND__.inspect()?.modal === 'gameplay');
    s = await inspect();
    check('ESC closes only shop', s.modal === 'gameplay', s.modal);
    return s;
  }

  async function elderAfterClear(expected, screenshotName) {
    let s = await villageAt(625);
    s = await pressInteract();
    check(`elder mentions ${expected}`, s.modal === 'dialogue' && s.dialogue?.text.includes(expected), s.dialogue);
    await shot(screenshotName);
    return finishDialogue();
  }

  async function enterGate(id, x) {
    let s = await villageAt(x, 46);
    const before = { ...s.stats };
    check(`${id} gate prompt visible`, s.nearby?.id === id || s.nearby?.interactionId === id, s.nearby);
    await shot(id === 'level1' ? '08-level1-gate' : '13-level2-gate');
    s = await pressInteract();
    await page.waitForFunction(() => window.__MISTBOUND__?.inspect()?.scene === 'Gameplay', { timeout: 10000 });
    s = await inspect();
    check(`${id} starts the shared combat scene`, s.scene === 'Gameplay', { scene: s.scene, levelId: s.levelId });
    check(`${id} entry preserves role growth`,
      s.level === before.level && s.experience === before.experience && s.gold === before.gold &&
      s.potionCount === before.potionCount && s.maxHp === before.maxHp && s.attackDamage === before.attackDamage,
      { before, after: { level: s.level, experience: s.experience, gold: s.gold, potionCount: s.potionCount, maxHp: s.maxHp, attackDamage: s.attackDamage } });
    milestones.push({ event: 'level-enter', level: id, levelStat: s.level, gold: s.gold, hp: s.hp });
    return s;
  }

  async function fightLevel(id) {
    const gaps = id === 'level1' ? [[1430, 1575], [2880, 3030], [4620, 4765]] : [[1180, 1315], [2100, 2240], [3050, 3175]];
    const exit = id === 'level1' ? 7000 : 5480;
    const deadline = Date.now() + (id === 'level1' ? 450000 : 380000);
    const seen = new Set();
    let lastJump = -1000, lastKills = 0, lastDeaths = 0;
    while (Date.now() < deadline) {
      const s = await inspect();
      if (!s) throw new Error(`${id} inspect returned no scene`);
      if (s.scene === 'Village') {
        check(`${id} return preserves role growth`, last?.scene === 'Gameplay' &&
          s.stats.level === last.level && s.stats.experience === last.experience &&
          s.stats.gold === last.gold && s.stats.potionCount === last.potionCount &&
          s.stats.maxHp === last.maxHp && s.stats.attackDamage === last.attackDamage,
          { before: last, after: s.stats });
        check(`${id} return has one village overlay`, await page.locator('.village-ui').count() === 1, await page.locator('.village-ui').count());
        return s;
      }
      last = s;
      if (s.scene !== 'Gameplay') throw new Error(`Unexpected scene ${s.scene}`);
      if (s.paused) { await driver.press('Escape'); await wait(65); continue; }
      if (s.deaths > lastDeaths) {
        lastDeaths = s.deaths;
        milestones.push({ event: 'death', level: id, deaths: s.deaths, x: Math.round(s.player.x) });
        if (!seen.has('death')) { seen.add('death'); await shot(`${id}-death`); }
        if (s.deaths > 8) throw new Error(`${id}: more than eight deaths; last state ${JSON.stringify(s)}`);
      }
      if (s.dead) { await driver.move(''); await wait(110); continue; }
      if (s.kills !== lastKills) { lastKills = s.kills; milestones.push({ event: 'kill', level: id, kills: s.kills, x: Math.round(s.player.x), hp: s.hp }); }
      if (s.boss?.visible) {
        const key = `boss-phase-${s.boss.phase}`;
        if (!seen.has(key)) { seen.add(key); milestones.push({ event: 'boss-phase', level: id, phase: s.boss.phase, bossHp: s.boss.hp }); await shot(`${id}-${key}`); }
      }
      const warning = s.hazards?.find(hazard => hazard.state === 'warning');
      if (warning && !seen.has('rock-warning')) { seen.add('rock-warning'); milestones.push({ event: 'falling-rock-warning', level: id, id: warning.id, x: Math.round(s.player.x) }); await shot(`${id}-falling-rock-warning`); }
      if (s.encounter?.state === 'defeated') {
        if (!seen.has('boss-defeated')) { seen.add('boss-defeated'); milestones.push({ event: 'boss-defeated', level: id, world: s.world, duration: s.encounter.lastDuration }); await shot(`${id}-boss-defeated`); }
        const dx = exit - s.player.x;
        if (Math.abs(dx) <= 70) {
          await driver.move('');
          if (s.returnPortalReadyAt > 0 && s.now >= s.returnPortalReadyAt) { await driver.press('e'); await wait(500); }
          else await wait(95);
          continue;
        }
        await driver.move(dx > 0 ? 'd' : 'a'); await wait(65); continue;
      }
      if (s.hp <= s.maxHp - 52 && s.potionCount > 0) await driver.press('q', 'potion');
      const hazard = s.hazards?.find(h => h.state === 'warning' && Math.abs(h.bounds.x + h.bounds.width / 2 - s.player.x) < 115);
      if (hazard?.progress > 0.42 && s.player.grounded && s.now - lastJump > 720) {
        await driver.press('Space', 'jump'); lastJump = s.now;
      }
      const x = s.player.x;
      const atGap = gaps.some(([a, b]) => x > a - 90 && x < b + 25);
      if (atGap) {
        await driver.move('d');
        if (s.player.grounded && s.now - lastJump > 700) { await driver.press('Space', 'jump'); lastJump = s.now; }
        await wait(55); continue;
      }
      const enemies = s.enemies.filter(enemy => enemy.hp > 0 && Math.abs(enemy.x - x) < 560 &&
        Math.abs(enemy.body.y - s.player.body.y) < (id === 'level2' ? 95 : 140) &&
        (enemy.archetype !== 'boss' && enemy.archetype !== 'ape-boss' || s.boss.visible));
      if (enemies.length) {
        const e = enemies.find(enemy => enemy.cue?.phase === 'windup') ?? enemies[0];
        const key = `${e.archetype}-${e.cue?.kind ?? 'engaged'}`;
        if (!seen.has(key)) { seen.add(key); await shot(`${id}-${key}`); }
        await driver.fight(s, enemies);
      } else await driver.move('d');
      await wait(55);
    }
    await driver.move('');
    throw new Error(`${id}: journey timed out; last state ${JSON.stringify(last)}`);
  }

  try {
    await page.goto('http://localhost:5177/');
    await page.waitForFunction(() => window.__MISTBOUND__?.inspect()?.scene === 'Village' && window.__MISTBOUND__.inspect()?.player?.grounded, { timeout: 15000 });
    let s = await inspect(); last = s;
    check('new game begins in Village intro', s.scene === 'Village' && !s.world.tutorialComplete && s.tutorial.stage === 'intro', { scene: s.scene, world: s.world, tutorial: s.tutorial });
    await shot('01-village-intro');
    await practice();
    await merchant(true);
    await enterGate('level1', 1930);
    s = await fightLevel('level1');
    check('first boss returns player to Village', s.scene === 'Village' && s.world.level1Cleared && s.world.level2Unlocked, { scene: s.scene, world: s.world });
    await wait(450);
    await shot('10-village-changed');
    milestones.push({ event: 'return-village', from: 'level1', stats: s.stats, world: s.world });
    await elderAfterClear('玄骸', '11-elder-after-level1');
    await merchant(false);
    await enterGate('level2', 2440);
    s = await fightLevel('level2');
    check('second boss returns player to Village', s.scene === 'Village' && s.world.level2Cleared, { scene: s.scene, world: s.world });
    await wait(450);
    await shot('17-chapter2-complete');
    milestones.push({ event: 'return-village', from: 'level2', stats: s.stats, world: s.world });
    await elderAfterClear('魇猿', '18-elder-after-level2');
    s = await villageAt(2940, 45);
    check('third gate remains locked', s.nearby?.id === 'level3' || s.nearby?.interactionId === 'level3', s.nearby);
    await shot('18-third-gate-locked');
    await pressInteract();
    s = await inspect();
    check('third gate does not start an unfinished chapter', s.scene === 'Village' && s.world.level2Cleared, { scene: s.scene, world: s.world });
    check('no console errors or failed resources', errors.length === 0 && failedRequests.length === 0, { errors, failedRequests });
    return { passed: true, checks, errors, failedRequests, milestones, screenshots, elapsedSeconds: Math.round((Date.now() - started) / 1000), inputs: driver.keys, final: s };
  } catch (error) {
    await driver.move('').catch(() => {});
    return { passed: false, checks, errors, failedRequests, milestones, screenshots, reason: String(error.stack ?? error), elapsedSeconds: Math.round((Date.now() - started) / 1000), inputs: driver.keys, final: await inspect().catch(() => last) };
  }
}
