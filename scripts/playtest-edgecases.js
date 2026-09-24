async (page,{startLevelOne}) => {
  const checks=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const check=(name,pass,detail)=>{checks.push({name,pass,detail});if(!pass)throw new Error(name+': '+JSON.stringify(detail));};
  await page.goto('http://localhost:5177/');
  await startLevelOne(page);
  await page.evaluate(()=>{const s=window.__MISTBOUND__.getSession();s.state.takeDamage(40);s.hitStopRemaining=250;});
  await page.keyboard.press('q');await page.waitForTimeout(500);
  const buffered=await page.evaluate(()=>window.__MISTBOUND__.inspect());
  check('hit-stop preserves queued action input',buffered.hp===120&&buffered.potionCount===2,{hp:buffered.hp,potions:buffered.potionCount});
  // Simulate an action transition without an intervening rendered Idle frame.
  await page.evaluate(()=>{const s=window.__MISTBOUND__.getSession();s.player.state='Attack';s.player.sprite.play('player-attack');s.player.sprite.anims.stop();s.player.lockedUntil=0;s.player.attackReadyAt=0;});
  await page.keyboard.press('j');await page.waitForTimeout(65);
  let state=await page.evaluate(()=>{const s=window.__MISTBOUND__.getSession();return {playing:s.player.sprite.anims.isPlaying,state:s.player.state,frame:s.player.sprite.frame.name};});
  check('consecutive attack restarts animation without idle frame',state.playing&&state.state==='Attack',state);
  await page.waitForTimeout(400);await page.keyboard.press('Shift');await page.waitForTimeout(35);
  state=await page.evaluate(()=>{const s=window.__MISTBOUND__.getSession();const before=s.player.hp;const damage=s.player.receiveDamage(50,-1,s.now,170);return {before,after:s.player.hp,damage,state:s.player.state};});
  check('dash invulnerability rejects incoming hit',state.state==='Dash'&&state.damage===0&&state.before===state.after,state);
  await page.waitForTimeout(250);
  await page.evaluate(()=>{const s=window.__MISTBOUND__.getSession();s.encounter.defeat(s.now);s.player.body.reset(7180,556);});
  await page.keyboard.down('d');await page.waitForTimeout(400);await page.keyboard.up('d');
  state=await page.evaluate(()=>window.__MISTBOUND__.inspect());
  check('right world boundary contains body',state.player.body.x+state.player.body.width<=7200.001,state.player.body);
  await page.goto('http://localhost:5177/');await startLevelOne(page);
  await page.evaluate(()=>{const s=window.__MISTBOUND__.getSession();const e=s.enemies[0];e.receiveDamage(999,1,s.now,0);});
  await page.waitForTimeout(1000);
  state=await page.evaluate(()=>{const s=window.__MISTBOUND__.getSession();return {remaining:s.enemies.length,hasDead:s.enemies.some(e=>e.id==='road-01')};});
  check('dead enemy view and entity are removed after fade',state.remaining===11&&!state.hasDead,state);
  await page.keyboard.press('F1');await page.waitForTimeout(60);await page.screenshot({path:'output/playwright/09-debug-after-removal.png'});
  check('debug survives removal with no stale labels',errors.length===0,errors);
  return {checks,errors};
}
