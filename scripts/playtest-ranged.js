async (page) => {
  const checks = [], errors = [], failedRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`); });
  const inspect = () => page.evaluate(() => window.__MISTBOUND__.inspect());
  const check = (name, pass, detail) => {
    checks.push({ name, pass, detail });
    if (!pass) throw new Error(`${name}: ${JSON.stringify(detail)}`);
  };
  await page.goto('http://localhost:5177/');
  await page.waitForFunction(() => window.__MISTBOUND__?.inspect()?.scene === 'Village');
  // Local combat fixture: isolate the raised archer so damage can only come from its bolt.
  await page.evaluate(() => {
    const api = window.__MISTBOUND__;
    api.getState().completeTutorial();
    api.getState().clearLevel('level1');
    api.game.scene.getScene('Village').scene.start('Gameplay', { levelId: 'level2' });
  });
  await page.waitForFunction(() => window.__MISTBOUND__?.inspect()?.scene === 'Gameplay');
  await page.evaluate(() => {
    const session = window.__MISTBOUND__.getSession();
    session.player.body.reset(1540, 556);
    for (const enemy of session.enemies) {
      if (enemy.id !== 'bridge-archer' && enemy.id !== 'ape-king') enemy.receiveDamage(enemy.maxHp, 1, session.now, 0);
    }
  });
  const start = await inspect();
  await page.waitForFunction(() => window.__MISTBOUND__.inspect().enemies.find(enemy => enemy.id === 'bridge-archer')?.cue?.phase === 'windup');
  const warned = await inspect();
  check('raised archer detects ground player and publishes bolt windup', warned.enemies.find(enemy => enemy.id === 'bridge-archer')?.alerted && warned.enemies.find(enemy => enemy.id === 'bridge-archer')?.cue?.kind === 'bolt', warned.enemies.find(enemy => enemy.id === 'bridge-archer'));
  await page.screenshot({ path: 'output/playwright/v03-raised-archer-aim.png' });
  await page.waitForFunction(initial => window.__MISTBOUND__.inspect()?.hp < initial, start.hp, { timeout: 5000 });
  const struck = await inspect();
  check('descending bolt reaches ground player', struck.hp < start.hp, { before: start.hp, after: struck.hp, attacks: struck.attacks });
  check('no runtime errors or missing resources', errors.length === 0 && failedRequests.length === 0, { errors, failedRequests });
  return { passed: true, checks, errors, failedRequests, beforeHp: start.hp, afterHp: struck.hp };
}
