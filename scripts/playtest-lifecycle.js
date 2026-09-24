async (page) => {
  const checks = [], errors = [], failedRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`); });
  const check = (name, pass, detail) => {
    checks.push({ name, pass, detail });
    if (!pass) throw new Error(`${name}: ${JSON.stringify(detail)}`);
  };
  await page.goto('http://localhost:5177/');
  await page.waitForFunction(() => window.__MISTBOUND__?.inspect()?.scene === 'Village');
  await page.evaluate(() => {
    const state = window.__MISTBOUND__.getState();
    state.completeTutorial();
    state.clearLevel('level1');
  });
  const initial = await page.evaluate(() => window.__MISTBOUND__.getState().serialize());
  for (const [index, levelId] of ['level1', 'level2', 'level1', 'level2'].entries()) {
    await page.evaluate(id => window.__MISTBOUND__.game.scene.getScene('Village').scene.start('Gameplay', { levelId: id }), levelId);
    await page.waitForFunction(id => window.__MISTBOUND__?.inspect()?.scene === 'Gameplay' &&
      window.__MISTBOUND__.inspect()?.levelId === (id === 'level1' ? 'mistbound-old-road' : 'level2-mist-road'), levelId);
    const combat = await page.evaluate(() => {
      const session = window.__MISTBOUND__.getSession();
      return { hudCount: document.querySelectorAll('#hud-root .hud-stage').length,
        villageCount: document.querySelectorAll('.village-ui').length,
        keyListeners: Object.values(session.input.keys).map(key => key.listenerCount('down')) };
    });
    check(`visit ${index + 1} ${levelId} has one HUD and one keyboard adapter`,
      combat.hudCount === 1 && combat.villageCount === 0 && combat.keyListeners.every(count => count === 1), combat);
    await page.evaluate(() => window.__MISTBOUND__.game.scene.getScene('Gameplay').scene.start('Village', { returning: true }));
    await page.waitForFunction(() => window.__MISTBOUND__?.inspect()?.scene === 'Village');
    const village = await page.evaluate(() => {
      const scene = window.__MISTBOUND__.game.scene.getScene('Village');
      return { hudCount: document.querySelectorAll('#hud-root .hud-stage').length,
        villageCount: document.querySelectorAll('.village-ui').length,
        keyListeners: Object.values(scene.controls.keys).map(key => key.listenerCount('down')),
        state: window.__MISTBOUND__.getState().serialize() };
    });
    check(`return ${index + 1} has one Village UI and preserves world flags`,
      village.hudCount === 1 && village.villageCount === 1 && village.keyListeners.every(count => count === 1) &&
      village.state.world.level1Cleared && village.state.world.level2Unlocked &&
      village.state.stats.level === initial.stats.level && village.state.stats.gold === initial.stats.gold &&
      village.state.stats.attackDamage === initial.stats.attackDamage,
      { hudCount: village.hudCount, villageCount: village.villageCount, keyListeners: village.keyListeners, stats: village.state.stats });
  }
  check('no runtime errors or missing resources', errors.length === 0 && failedRequests.length === 0, { errors, failedRequests });
  return { passed: true, checks, errors, failedRequests };
}
