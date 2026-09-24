/** Actual keyboard agent. Decisions use only the same current cues exposed to the player. */
export async function startLevelOne(page) {
  // Legacy combat suites intentionally begin at their original Level 1 fixture.
  // The v0.3 journey suite separately exercises the complete village gate flow.
  await page.waitForFunction(() => window.__MISTBOUND__?.inspect()?.scene === 'Village');
  await page.evaluate(() => {
    const api = window.__MISTBOUND__;
    const state = api.getState();
    state.completeTutorial();
    state.stats.gold = 0;
    state.stats.potionCount = 3;
    api.game.scene.getScene('Village').scene.start('Gameplay', { levelId: 'level1' });
  });
  await page.waitForFunction(() => window.__MISTBOUND__?.inspect()?.scene === 'Gameplay' && window.__MISTBOUND__.inspect()?.player.grounded);
}
export function makeDriver(page) {
  let held='';
  let lastAction=0,lastJump=0,lastDodge=0;
  const keys={attack:0,skill:0,dash:0,jump:0,potion:0};
  const move=async key=>{if(key===held)return;if(held)await page.keyboard.up(held);held=key;if(key)await page.keyboard.down(key);};
  const press=async(key,kind)=>{await page.keyboard.press(key);if(kind)keys[kind]++;};
  const face=async direction=>{await move(direction>0?'d':'a');await page.waitForTimeout(25);await move('');};
  async function fight(s, enemies, {mash=false,standing=false}={}) {
    const now=s.now,p=s.player;
    const enemy=[...enemies].filter(e=>e.hp>0).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
    if(!enemy){await move('');return;}
    const dx=enemy.x-p.x,dir=Math.sign(dx)||1,distance=Math.abs(dx),cue=enemy.cue;
    const free=!['Attack','Skill','Hurt','Dash','Death'].includes(s.state);
    if(mash) {
      if(standing){await move('');if(free&&now-lastAction>405){await press('j','attack');lastAction=now;}return;}
      if(distance>65) await move(dir>0?'d':'a');
      else {if(p.facing!==dir&&free)await face(dir);else await move('');if(free&&now-lastAction>405){await press('j','attack');lastAction=now;}}
      return;
    }
    if(s.hp<=s.maxHp-52&&s.potionCount>0)await press('q','potion');
    const behind=cue&&cue.kind!=='shockwave'&&(p.x-enemy.x)*cue.direction<-25;
    const danger=enemies.filter(e=>e.hp>0&&e.cue&&e.cue.phase!=='recovery'&&e.cue.kind!=='transition'&&(e.cue.kind==='shockwave'||(p.x-e.x)*e.cue.direction>=-25)&&Math.abs(e.x-p.x)<(e.cue.kind==='lunge'||e.cue.kind==='phantom'?340:e.cue.range+65));
    const threat=danger.find(e=>e.cue.phase==='active'||e.cue.progress>0.33);
    if(threat&&free) {
      const c=threat.cue,tdir=Math.sign(threat.x-p.x)||1;
      // Jump the ground wave. Locked-facing slashes can be evaded by crossing behind.
      if(c.kind==='shockwave'&&p.grounded&&now-lastJump>700){await press('Space','jump');lastJump=now;}
      else if(s.dashCooldown<=0&&now-lastDodge>1000&&Math.abs(threat.x-p.x)<175) {
        await move(tdir>0?'d':'a');await press('Shift','dash');lastDodge=now;return;
      } else {await move(tdir>0?'a':'d');return;}
    }
    if(cue&&cue.kind==='shockwave'&&cue.phase==='windup'&&cue.progress>0.55&&p.grounded&&free&&now-lastJump>700){await press('Space','jump');lastJump=now;}
    // Avoid incoming independent bolts/waves using visible moving attack bounds.
    const missile=s.attacks.find(a=>a.source!=='player'&&a.projectile&&a.active&&Math.abs(a.bounds.x-p.x)<130&&Math.abs(a.bounds.y-p.body.y)<100);
    if(missile&&free&&p.grounded&&now-lastJump>700){await press('Space','jump');lastJump=now;}
    const recovering=behind||!cue||cue.phase==='recovery'||cue.kind==='transition'||enemy.state==='Stagger';
    if(distance>76){
      await move(dir>0?'d':'a');
      if(distance<480&&distance>160&&s.skillCooldown<=0&&free&&!threat){await press('k','skill');lastAction=now;}
    }else {
      if(p.facing!==dir&&free)await face(dir);else await move('');
      // Do not commit into a known windup: a 380ms player swing cannot be dash-cancelled.
      if(free&&recovering&&now-lastAction>405) {
        if(s.skillCooldown<=0){await press('k','skill');lastAction=now;}
        else {await press('j','attack');lastAction=now;}
      }
    }
  }
  return {move,press,fight,keys};
}
