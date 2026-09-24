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
    const api = window.__MISTBOUND__;
    api.getState().completeTutorial();
    api.getState().clearLevel('level1');
    api.game.scene.getScene('Village').scene.start('Gameplay', { levelId: 'level2' });
  });
  await page.waitForFunction(() => window.__MISTBOUND__?.inspect()?.scene === 'Gameplay');
  await page.evaluate(() => {
    const session = window.__MISTBOUND__.getSession();
    session.player.body.reset(4700, 556);
    session.encounter.boss.body.reset(5210, 528);
  });
  await page.waitForFunction(() => {
    const enemy = window.__MISTBOUND__.inspect()?.enemies.find(item => item.id === 'ape-king');
    return enemy?.cue?.kind === 'rock' && enemy.cue.phase === 'windup' && enemy.cue.progress > 0.45;
  }, null, { timeout: 6000 });
  const warned = await page.evaluate(() => window.__MISTBOUND__.inspect());
  check('ape announces the rock throw before release', warned.enemies.find(enemy => enemy.id === 'ape-king')?.cue?.kind === 'rock', warned.boss);
  await page.screenshot({ path: 'output/playwright/v03-ape-rock-telegraph.png' });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__MISTBOUND__.getSession().combat.attacks.some(attack => attack.kind === 'rock' && attack.window.active), null, { timeout: 4000 });
  const rock = await page.evaluate(() => {
    const session = window.__MISTBOUND__.getSession();
    const attack = session.combat.attacks.find(item => item.kind === 'rock');
    return { speedY: attack?.speedY, bounds: attack?.bounds, playerY: session.player.centerY, bossY: session.encounter.boss.centerY };
  });
  check('rock aims upward at the player position on release', rock.speedY < -20 && rock.playerY < rock.bossY, rock);
  check('no runtime errors or missing resources', errors.length === 0 && failedRequests.length === 0, { errors, failedRequests });
  return { passed: true, checks, errors, failedRequests, rock };
}
