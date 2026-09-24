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
  for (const [width, height] of [[1280, 720], [1920, 1080], [800, 600], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(180);
    const frame = await page.evaluate(() => {
      const canvas = document.getElementById('game-container').getBoundingClientRect();
      const hud = document.getElementById('hud-root').getBoundingClientRect();
      return { canvas: canvas.toJSON(), hud: hud.toJSON(), scrollWidth: document.documentElement.scrollWidth };
    });
    check(`${width}x${height} keeps game and HUD inside viewport`,
      frame.canvas.left >= -1 && frame.canvas.top >= -1 && frame.canvas.right <= width + 1 &&
      frame.canvas.bottom <= height + 1 && Math.abs(frame.canvas.width - frame.hud.width) < 1 &&
      Math.abs(frame.canvas.height - frame.hud.height) < 1 && frame.scrollWidth <= width,
      frame);
    await page.screenshot({ path: `output/playwright/v03-village-${width}x${height}.png` });
  }
  await page.evaluate(() => window.__MISTBOUND__.game.scene.getScene('Village').player.body.reset(1370, 556));
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__MISTBOUND__.inspect()?.modal === 'dialogue');
  await page.screenshot({ path: 'output/playwright/v03-dialogue-390x844.png' });
  for (let i = 0; i < 3; i++) await page.locator('[data-village-action="next"]').click();
  await page.waitForFunction(() => window.__MISTBOUND__.inspect()?.modal === 'shop');
  for (const [width, height] of [[390, 844], [800, 600], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(180);
    const box = await page.locator('.village-shop').boundingBox();
    const stage = await page.locator('#hud-root').boundingBox();
    check(`${width}x${height} shop remains within game region`, Boolean(box && stage &&
      box.x >= stage.x - 1 && box.y >= stage.y - 1 && box.x + box.width <= stage.x + stage.width + 1 &&
      box.y + box.height <= stage.y + stage.height + 1), { box, stage });
    await page.screenshot({ path: `output/playwright/v03-shop-${width}x${height}.png` });
  }
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__MISTBOUND__.inspect()?.modal === 'gameplay');
  await page.keyboard.press('F1');
  await page.screenshot({ path: 'output/playwright/v03-village-debug.png' });
  check('no runtime errors or missing resources', errors.length === 0 && failedRequests.length === 0, { errors, failedRequests });
  return { passed: true, checks, errors, failedRequests };
}
