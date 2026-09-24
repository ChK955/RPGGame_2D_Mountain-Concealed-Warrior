async(page,{makeDriver,startLevelOne})=>{
  const errors=[],failedRequests=[],milestones=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failedRequests.push(`${r.status()} ${r.url()}`);});
  await page.goto('http://localhost:5177/');await startLevelOne(page);
  const driver=makeDriver(page),started=Date.now(),shots=new Set();let lastKills=0,lastJump=-1000,lastCheckpoint='',lastPhase=0;
  const gaps=[[1430,1575],[2880,3030],[4620,4765]];
  while(Date.now()-started<420000){
    const s=await page.evaluate(()=>window.__MISTBOUND__.inspect());
    if(s.paused)await page.keyboard.press('Escape');
    if(s.dead){await driver.move('');await page.waitForTimeout(100);continue;}
    if(s.world.level1Cleared&&s.encounter.state==='defeated'){
      const dx=7000-s.player.x;
      if(Math.abs(dx)>65){await driver.move(dx>0?'d':'a');await page.waitForTimeout(60);continue;}
      await driver.move('');
      if(s.returnPortalReadyAt<=0||s.now<s.returnPortalReadyAt){await page.waitForTimeout(100);continue;}
      await driver.press('e');
      await page.waitForFunction(()=>window.__MISTBOUND__?.inspect()?.scene==='Village');
      const village=await page.evaluate(()=>window.__MISTBOUND__.inspect());
      await page.screenshot({path:'output/playwright/08-complete.png'});
      return {passed:village.world.level1Cleared,elapsedSeconds:Math.round((Date.now()-started)/1000),bossSeconds:Math.round(s.encounter.lastDuration/1000),deaths:s.deaths,kills:s.kills,level:village.stats.level,hp:village.stats.hp,gold:village.stats.gold,inputs:driver.keys,errors,failedRequests,milestones};
    }
    if(s.kills!==lastKills){lastKills=s.kills;milestones.push({event:'kill',kills:s.kills,x:Math.round(s.player.x),hp:s.hp,level:s.level,seconds:Math.round(s.now/1000)});}
    if(s.checkpoint.x!==lastCheckpoint){lastCheckpoint=s.checkpoint.x;milestones.push({event:'checkpoint',x:lastCheckpoint});}
    if(s.boss.visible&&s.boss.phase!==lastPhase){lastPhase=s.boss.phase;milestones.push({event:'boss-phase',phase:lastPhase,hp:s.hp,seconds:Math.round(s.now/1000)});}
    if(s.hp<=s.maxHp-52&&s.potionCount>0)await driver.press('q','potion');
    const x=s.player.x,atGap=gaps.some(([a,b])=>x>a-85&&x<b+22);
    if(atGap){await driver.move('d');if(s.player.grounded&&s.now-lastJump>700){await driver.press('Space','jump');lastJump=s.now;}await page.waitForTimeout(60);continue;}
    const enemies=s.enemies.filter(e=>e.hp>0&&Math.abs(e.x-x)<560&&Math.abs(e.body.y-s.player.body.y)<140&&(e.archetype!=='boss'||s.boss.visible));
    if(enemies.length){
      const e=enemies.find(e=>e.cue?.phase==='windup')??enemies[0];
      const shot=e.state==='Stagger'?'poise-break':e.cue?.phase==='windup'?`${e.archetype}-${e.cue.kind}-telegraph`:e.archetype;
      if(!shots.has(shot)){shots.add(shot);await page.screenshot({path:`output/playwright/v02-journey-${shot}.png`});}
      await driver.fight(s,enemies);
    }else await driver.move('d');
    await page.waitForTimeout(55);
  }
  await driver.move('');return {passed:false,reason:'420 second journey timeout',errors,failedRequests,milestones,state:await page.evaluate(()=>window.__MISTBOUND__.inspect())};
}
