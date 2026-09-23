import type { HudSnapshot } from '../game/data/types';

interface HudCallbacks {
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
}

const icons = {
  sword: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="m28 6 6-1-1 6-16 17-5-5L28 6ZM10 21l9 9M7 33l6-7M5 35l4-1"/></svg>',
  wave: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 30C26 27 29 15 31 6 32 24 22 33 8 30ZM8 22c8-1 12-5 15-11M8 15l6-4"/></svg>',
  dash: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="m18 9 14 11-14 11 5-11-5-11ZM5 14h8M3 20h12M5 26h8"/></svg>',
  flask: '<svg viewBox="0 0 28 36" aria-hidden="true"><path d="M10 3h8M11 4v7L5 21v8l4 4h10l4-4v-8l-6-10V4M6 23h16"/><path class="flask-fill" d="M7 24h14v4l-3 3h-8l-3-3Z"/></svg>',
  coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z"/><path d="M9 9h6v6H9z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6v12M16 6v12"/></svg>',
  lantern: '<svg viewBox="0 0 32 40" aria-hidden="true"><path d="M16 2v5M7 11l9-4 9 4-2 19H9L7 11ZM5 11h22M9 30h14M16 30v7M12 14l1 12M20 14l-1 12M16 13v14"/></svg>',
};

const clamp = (value: number, max: number): number => Math.min(1, Math.max(0, value / Math.max(1, max)));
const formatTime = (milliseconds: number): string => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
};

/** The DOM view consumes snapshots only; all gameplay rules stay in GameSession. */
export class Hud {
  private readonly stage: HTMLDivElement;
  private readonly resizeObserver: ResizeObserver;
  private readonly listeners = new AbortController();
  private readonly nodes = new Map<string, HTMLElement>();
  private readonly notificationTimers = new Set<number>();
  private overlay: 'none' | 'pause' | 'death' | 'complete' = 'none';

  constructor(private readonly root: HTMLElement, private readonly callbacks: HudCallbacks) {
    this.stage = document.createElement('div');
    this.stage.className = 'hud-stage';
    this.stage.innerHTML = `
      <section class="vitals" aria-label="角色属性">
        <div class="wordmark"><span class="wordmark-zh">雾隐</span><span class="wordmark-en">MISTBOUND</span><span class="wordmark-seal" aria-hidden="true">行</span></div>
        <div class="vitals-row">
          <div class="level-crest" aria-label="等级"><span>境</span><strong data-hud="level">1</strong></div>
          <div class="vitals-bars">
            <div class="hp-caption"><span>气血 <small>VITALITY</small></span><span data-hud="hp-value">120 / 120</span></div>
            <div class="hp-track" data-hud="hp-track" role="progressbar" aria-label="气血" aria-valuemin="0"><div class="hp-fill" data-hud="hp-fill"></div></div>
            <div class="xp-row"><div class="xp-track" data-hud="xp-track" role="progressbar" aria-label="修为经验" aria-valuemin="0"><div class="xp-fill" data-hud="xp-fill"></div></div><span data-hud="xp-value">0 / 100</span></div>
          </div>
        </div>
      </section>

      <section class="journey" aria-label="当前旅程">
        <div class="journey-copy"><p class="chapter">壹 <span>残灯古道</span></p><h1 data-hud="location">雾隐山门</h1><p class="objective"><span class="objective-diamond" aria-hidden="true"></span><span data-hud="objective">循着灯火，向东前行</span></p><div class="journey-track"><span data-hud="progress"></span><i></i></div><span class="checkpoint" data-hud="checkpoint" hidden>灯台已燃 · 可在此重生</span></div>
        <button class="pause-button" data-action="pause" type="button" aria-label="暂停游戏，Escape" title="暂停 · Esc">${icons.pause}<span>ESC</span></button>
      </section>

      <section class="boss-hud" data-hud="boss" aria-label="镇关鬼将" aria-hidden="true">
        <div class="boss-heading"><span class="boss-ornament" aria-hidden="true">◇</span><h2 data-hud="boss-name">镇关鬼将 · 玄骸</h2><span class="boss-ornament" aria-hidden="true">◇</span></div>
        <div class="boss-hp-track" data-hud="boss-hp-track" role="progressbar" aria-label="Boss 气血" aria-valuemin="0"><div class="boss-hp-fill" data-hud="boss-hp-fill"></div><span class="boss-threshold first"></span><span class="boss-threshold second"></span></div>
        <div class="boss-poise-track" data-hud="boss-poise-track" role="progressbar" aria-label="Boss 韧性" aria-valuemin="0"><span data-hud="boss-poise-fill"></span></div>
        <p class="boss-debug" data-hud="boss-debug" hidden></p>
      </section>

      <section class="supplies" aria-label="补给与金币">
        <div class="supplies-row"><div class="potion"><kbd>Q</kbd><span class="potion-icon">${icons.flask}</span><div><span class="supply-label">回春散</span><strong data-hud="potions">3</strong></div></div><span class="supply-divider"></span><div class="gold">${icons.coin}<strong data-hud="gold">0</strong><span>铜钱</span></div></div>
        <p class="movement-hint"><kbd>A</kbd><kbd>D</kbd><span>行走</span><kbd class="key-space">SPACE</kbd><span>跳跃</span></p>
      </section>

      <section class="abilities" aria-label="战斗操作">
        <div class="ability"><div class="ability-tile">${icons.sword}<kbd>J</kbd></div><span class="ability-name">断水</span></div>
        <div class="ability" data-hud="skill" aria-label="剑气技能，K"><div class="ability-tile">${icons.wave}<span class="cooldown-shade" data-hud="skill-shade"></span><strong class="cooldown-value" data-hud="skill-cooldown"></strong><kbd>K</kbd></div><span class="ability-name">剑气</span><span class="ability-status" data-hud="skill-status">就绪</span></div>
        <div class="ability" data-hud="dash" aria-label="闪避，Shift"><div class="ability-tile">${icons.dash}<span class="cooldown-shade" data-hud="dash-shade"></span><strong class="cooldown-value" data-hud="dash-cooldown"></strong><kbd class="key-shift">SHIFT</kbd></div><span class="ability-name">掠影</span><span class="ability-status" data-hud="dash-status">就绪</span></div>
      </section>

      <div class="notifications" data-hud="notifications" role="status" aria-live="polite" aria-atomic="false"></div>
      <pre class="debug-readout" data-hud="debug" hidden></pre>

      <div class="menu-backdrop" data-hud="pause-overlay" hidden>
        <section class="pause-panel" role="dialog" aria-modal="true" aria-labelledby="pause-title">
          <span class="menu-kicker">MISTBOUND · 残灯古道</span><div class="menu-ornament" aria-hidden="true">${icons.lantern}</div>
          <h2 id="pause-title">暂歇片刻</h2><p class="menu-subtitle">山风未止，归途尚远。</p>
          <div class="menu-actions"><button class="menu-button primary" type="button" data-action="resume"><span>继续旅程</span><small>RESUME <span aria-hidden="true">↗</span></small></button><button class="menu-button" type="button" data-action="controls" aria-expanded="false" aria-controls="controls-list"><span>招式与身法</span><small>CONTROLS <span aria-hidden="true">＋</span></small></button><button class="menu-button" type="button" data-action="restart"><span>重新启程</span><small>RESTART <span aria-hidden="true">↺</span></small></button></div>
          <div id="controls-list" class="controls-list" data-hud="controls" hidden><p><span>移动 / 跳跃</span><span><kbd>A</kbd> <kbd>D</kbd> / <kbd>SPACE</kbd></span></p><p><span>普攻 / 剑气 / 闪避</span><span><kbd>J</kbd> / <kbd>K</kbd> / <kbd>SHIFT</kbd></span></p><p><span>使用药水 / 暂停</span><span><kbd>Q</kbd> / <kbd>ESC</kbd></span></p><p><span>碰撞与状态调试</span><kbd>F1</kbd></p></div>
          <p class="menu-footnote"><kbd>ESC</kbd> 返回古道</p>
        </section>
      </div>

      <div class="death-overlay" data-hud="death-overlay" hidden role="status"><span class="death-rule"></span><h2>灯火未熄</h2><p>稍候，于最近的灯台重生</p><span class="death-rule"></span></div>

      <div class="menu-backdrop complete-backdrop" data-hud="complete-overlay" hidden>
        <section class="complete-panel" role="dialog" aria-modal="true" aria-labelledby="complete-title"><span class="menu-kicker">CHAPTER I · 行路终有尽</span><div class="completion-seal" aria-hidden="true">归</div><h2 id="complete-title">穿雾而归</h2><p class="menu-subtitle">残灯照归路。此行，已破长夜。</p><div class="completion-stats"><div><span>行路时长</span><strong data-hud="complete-time">00:00</strong></div><div><span>斩落妖影</span><strong data-hud="complete-kills">0</strong></div><div><span>修行境界</span><strong data-hud="complete-level">1</strong></div></div><button class="menu-button primary" type="button" data-action="complete-restart"><span>再入山门</span><small>PLAY AGAIN <span aria-hidden="true">↗</span></small></button><span class="completion-note">雾隐 · 第一章终</span></section>
      </div>`;
    this.root.replaceChildren(this.stage);
    this.stage.querySelectorAll<HTMLElement>('[data-hud]').forEach((node) => {
      this.nodes.set(node.dataset.hud ?? '', node);
    });
    const options = { signal: this.listeners.signal };
    this.stage.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLButtonElement>('button[data-action]');
      if (!button) return;
      switch (button.dataset.action) {
        case 'pause': this.callbacks.onPause(); break;
        case 'resume': this.callbacks.onResume(); break;
        case 'restart':
        case 'complete-restart': this.callbacks.onRestart(); break;
        case 'controls': {
          const controls = this.node('controls');
          controls.hidden = !controls.hidden;
          button.setAttribute('aria-expanded', String(!controls.hidden));
          break;
        }
      }
    }, options);
    // Keep keyboard navigation inside the active modal without handling game input.
    this.stage.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab' || (this.overlay !== 'pause' && this.overlay !== 'complete')) return;
      const modal = this.node(`${this.overlay}-overlay`);
      const buttons = Array.from(modal.querySelectorAll<HTMLButtonElement>('button'));
      const first = buttons[0];
      const last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }, options);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.root);
    this.resize();
  }

  update(snapshot: HudSnapshot): void {
    this.setText('level', String(snapshot.level));
    this.setText('hp-value', `${Math.ceil(snapshot.hp)} / ${snapshot.maxHp}`);
    this.node('hp-fill').style.transform = `scaleX(${clamp(snapshot.hp, snapshot.maxHp)})`;
    this.node('hp-track').setAttribute('aria-valuenow', String(Math.ceil(snapshot.hp)));
    this.node('hp-track').setAttribute('aria-valuemax', String(snapshot.maxHp));
    this.node('hp-track').classList.toggle('is-low', snapshot.hp / snapshot.maxHp < 0.3);
    this.node('xp-fill').style.transform = `scaleX(${clamp(snapshot.experience, snapshot.experienceToNext)})`;
    this.setText('xp-value', `${snapshot.experience} / ${snapshot.experienceToNext}`);
    this.node('xp-track').setAttribute('aria-valuenow', String(snapshot.experience));
    this.node('xp-track').setAttribute('aria-valuemax', String(snapshot.experienceToNext));
    this.setText('potions', String(snapshot.potionCount));
    this.setText('gold', String(snapshot.gold));
    this.setText('location', snapshot.location);
    this.setText('objective', snapshot.objective);
    this.node('progress').style.width = `${clamp(snapshot.progress, 1) * 100}%`;
    this.node('checkpoint').hidden = !snapshot.checkpointActive;
    this.setText('checkpoint', snapshot.bossCheckpointActive ? '关前息灯已燃 · 归魂之所' : '灯台已燃 · 可在此重生');
    const boss = snapshot.boss;
    const bossVisible = Boolean(boss?.visible);
    const bossNode = this.node('boss');
    bossNode.classList.toggle('is-visible', bossVisible);
    bossNode.setAttribute('aria-hidden', String(!bossVisible));
    if (boss) {
      bossNode.dataset.phase = String(boss.phase);
      bossNode.classList.toggle('is-transitioning', boss.transitioning);
      this.setText('boss-name', boss.name);
      this.node('boss-hp-fill').style.transform = `scaleX(${clamp(boss.hp, boss.maxHp)})`;
      this.node('boss-hp-track').setAttribute('aria-valuenow', String(Math.ceil(boss.hp)));
      this.node('boss-hp-track').setAttribute('aria-valuemax', String(boss.maxHp));
      this.node('boss-poise-fill').style.transform = `scaleX(${clamp(boss.poise, boss.maxPoise)})`;
      this.node('boss-poise-track').setAttribute('aria-valuenow', String(Math.ceil(boss.poise)));
      this.node('boss-poise-track').setAttribute('aria-valuemax', String(boss.maxPoise));
      this.node('boss-poise-track').classList.toggle('is-broken', boss.state === 'Stagger');
      this.node('boss-debug').hidden = !snapshot.debug;
      this.setText('boss-debug', `PHASE ${boss.phase} · ${boss.state} · ${boss.skill || '—'} · POISE ${Math.ceil(boss.poise)}/${boss.maxPoise}`);
    }
    this.updateCooldown('skill', snapshot.skillCooldown, snapshot.skillCooldownMax);
    this.updateCooldown('dash', snapshot.dashCooldown, snapshot.dashCooldownMax);
    this.node('debug').hidden = !snapshot.debug;
    if (snapshot.debug) {
      this.setText('debug', `DEBUG / F1\n${Math.round(snapshot.fps)} FPS  ·  ${snapshot.state}\nHP ${Math.round(snapshot.hp)}/${snapshot.maxHp}  ·  LV ${snapshot.level}\nEnemies ${snapshot.kills}/${snapshot.totalEnemies}  ·  ${formatTime(snapshot.elapsed)}\n${snapshot.paused ? 'SIMULATION PAUSED' : 'SIMULATION RUNNING'}`);
    }
    this.setText('complete-time', formatTime(snapshot.elapsed));
    this.setText('complete-kills', `${snapshot.kills} / ${snapshot.totalEnemies}`);
    this.setText('complete-level', String(snapshot.level));
    this.showOverlay(snapshot.completed ? 'complete' : snapshot.paused ? 'pause' : snapshot.dead ? 'death' : 'none');
  }

  notify(message: string, kind: 'info' | 'success' | 'danger' = 'info'): void {
    const notification = document.createElement('p');
    notification.className = `notification notification-${kind}`;
    notification.textContent = message;
    const container = this.node('notifications');
    container.append(notification);
    while (container.childElementCount > 3) container.firstElementChild?.remove();
    const timer = window.setTimeout(() => {
      notification.remove();
      this.notificationTimers.delete(timer);
    }, 3700);
    this.notificationTimers.add(timer);
  }

  destroy(): void {
    this.listeners.abort();
    this.resizeObserver.disconnect();
    this.notificationTimers.forEach((timer) => window.clearTimeout(timer));
    this.notificationTimers.clear();
    if (this.stage.contains(document.activeElement)) this.focusGame();
    this.nodes.clear();
    this.stage.remove();
  }

  private node(name: string): HTMLElement {
    const node = this.nodes.get(name);
    if (!node) throw new Error(`Missing HUD element: ${name}`);
    return node;
  }

  private setText(name: string, value: string): void {
    const node = this.node(name);
    if (node.textContent !== value) node.textContent = value;
  }

  private resize(): void {
    // Keep fractional CSS pixels: portrait letterboxing often has a non-integer height.
    const bounds = this.root.getBoundingClientRect();
    const scale = Math.min(bounds.width / 1280, bounds.height / 720);
    this.stage.style.transform = `scale(${scale})`;
  }

  private updateCooldown(name: 'skill' | 'dash', remaining: number, maximum: number): void {
    const coolingDown = remaining > 0;
    this.node(name).classList.toggle('is-cooling', coolingDown);
    this.node(`${name}-shade`).style.transform = `scaleY(${clamp(remaining, maximum)})`;
    this.setText(`${name}-cooldown`, coolingDown ? (Math.ceil(remaining / 100) / 10).toFixed(1) : '');
    this.setText(`${name}-status`, coolingDown ? '调息' : '就绪');
  }

  private showOverlay(next: typeof this.overlay): void {
    if (next === this.overlay) return;
    const previous = this.overlay;
    this.overlay = next;
    for (const name of ['pause', 'death', 'complete']) this.node(`${name}-overlay`).hidden = name !== next;
    this.stage.classList.toggle('is-in-menu', next === 'pause' || next === 'complete');
    if (next === 'pause' || next === 'complete') {
      this.node(`${next}-overlay`).querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    } else if (previous === 'pause' || previous === 'complete') {
      this.focusGame();
    }
  }

  private focusGame(): void {
    // Return Space to jumping instead of leaving a native button focused.
    this.root.parentElement?.querySelector<HTMLElement>('#game-container')?.focus({ preventScroll: true });
  }
}
