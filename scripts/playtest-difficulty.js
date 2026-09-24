async (page,{makeDriver,startLevelOne}) => {
  const checks=[],errors=[],failedRequests=[],results=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failedRequests.push(`${r.status()} ${r.url()}`);});
  const check=(name,pass,detail)=>{checks.push({name,pass,detail});if(!pass)throw new Error(name+': '+JSON.stringify(detail));};
  const inspect=()=>page.evaluate(()=>window.__MISTBOUND__.inspect());
  async function fixture(boss) {
    await page.goto('http://localhost:5177/');
    await startLevelOne(page);
    await page.evaluate(boss=>{
      const s=window.__MISTBOUND__.getSession();
      if(boss) {
        s.state.gainExperience(480); // Representative level4 reached on the ordinary route.
        s.state.activateCheckpoint(s.map.bossArena.checkpoint,'boss');s.player.body.reset(6220,556);s.player.face(1);
      } else {
        const pair=['bridge-03','shrine-01'].map(id=>s.enemies.find(enemy=>enemy.id===id));
        pair.forEach((e,i)=>{e.resetPosition(true);e.body.reset(920+i*65,556);e.spawn.patrolLeft=550;e.spawn.patrolRight=1400;});
        s.player.body.reset(860,556);s.player.face(1);
      }
    },boss);
  }
  async function trial(name,boss,mash) {
    await fixture(boss);const driver=makeDriver(page);const started=Date.now();let s=await inspect(),initialHp=s.hp,minHp=s.hp,phases=new Set(),shots=new Set(),damageTaken=0,lastHp=s.hp;
    while(Date.now()-started<(boss?150000:55000)) {
      s=await inspect();minHp=Math.min(minHp,s.hp);if(s.hp<lastHp)damageTaken+=lastHp-s.hp;lastHp=s.hp;
      const enemies=s.enemies.filter(e=>boss?e.archetype==='boss':['bridge-03','shrine-01'].includes(e.id));
      if(boss&&s.boss)phases.add(s.boss.phase);
      const e=enemies.find(e=>e.hp>0);
      const shot=boss?(s.dead?'death':!e?'victory':e.cue?.kind==='shockwave'&&e.cue.phase==='active'?'shockwave':`phase-${s.boss.phase}`):null;
      if(shot&&!shots.has(shot)&&!mash){shots.add(shot);await page.screenshot({path:`output/playwright/v02-boss-${shot}.png`});}
      if(s.dead||enemies.every(e=>e.hp<=0))break;
      await driver.fight(s,enemies,{mash,standing:mash&&!boss});
      await page.waitForTimeout(55);
    }
    await driver.move('');
    const remaining=s.enemies.filter(e=>boss?e.archetype==='boss':['bridge-03','shrine-01'].includes(e.id)).map(e=>({id:e.id,hp:e.hp}));
    const result={name,dead:s.dead,remaining,initialHp,minHp,hp:s.hp,damageTaken,elapsedSeconds:Math.round((Date.now()-started)/1000),simSeconds:Math.round((s.now-(s.encounter?.startedAt||0))/1000),phases:[...phases],inputs:driver.keys,encounter:s.encounter};results.push(result);
    await page.screenshot({path:`output/playwright/v02-${name}.png`});
    return result;
  }
  const a=await trial('A-face-tank',false,true);
  check('A: standing J takes substantial punishment',a.damageTaken>=54,a);
  const b=await trial('B-skillful-pair',false,false);
  check('B: same pair defeated with movement, skills and dash',!b.dead&&b.remaining.every(e=>e.hp<=0)&&b.inputs.skill>0&&b.inputs.dash>0,b);
  const c=await trial('C-boss-mash',true,true);
  check('C: J mash absorbs substantial boss damage across all phases',c.damageTaken>=100&&c.phases.length===3&&c.inputs.dash===0&&c.inputs.skill===0,c);
  const d=await trial('D-boss-proper',true,false);
  check('D: proper play defeats all three boss phases',!d.dead&&d.remaining.every(e=>e.hp<=0)&&d.phases.length===3&&d.inputs.skill>0&&d.inputs.dash>0,d);
  check('D: measured play takes less damage than standing J',d.damageTaken<c.damageTaken,{mash:c.damageTaken,proper:d.damageTaken});
  check('no console errors or failed resources',errors.length===0&&failedRequests.length===0,{errors,failedRequests});
  return {passed:true,checks,results,errors,failedRequests};
}
