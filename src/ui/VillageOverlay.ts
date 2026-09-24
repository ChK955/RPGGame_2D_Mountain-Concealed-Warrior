export type VillageMode = 'gameplay' | 'dialogue' | 'shop' | 'paused';

export interface VillageShopCard {
  id: string;
  name: string;
  description: string;
  price: number;
  disabled: boolean;
  reason?: string;
}

export interface VillageOverlayState {
  mode: VillageMode;
  phase: 'VILLAGE_INTRO' | 'LEVEL1_CLEARED' | 'LEVEL2_CLEARED';
  hp: number;
  maxHp: number;
  level: number;
  experience: number;
  experienceToNext: number;
  gold: number;
  potionCount: number;
  objective: string;
  tutorialPrompt?: string;
  interactionPrompt?: string;
  dialogue?: { speaker: string; text: string; index: number; total: number } | null;
  shopItems?: VillageShopCard[];
  debug?: string;
}

export interface VillageOverlayActions {
  onPause(): void;
  onResume(): void;
  onClose(): void;
  onDialogueNext(): void;
  onBuy(id: string): void;
}

const pct = (value: number, max: number): number => Math.max(0, Math.min(100, value / Math.max(1, max) * 100));

/** Disposable DOM presentation for the hub. It never mutates GameState itself. */
export class VillageOverlay {
  private readonly stage: HTMLDivElement;
  private readonly nodes = new Map<string, HTMLElement>();
  private readonly listeners = new AbortController();
  private readonly resizeObserver: ResizeObserver;
  private readonly notificationTimers = new Set<number>();
  private mode: VillageMode = 'gameplay';
  private shopSignature = '';

  constructor(private readonly root: HTMLElement, private readonly actions: VillageOverlayActions) {
    this.stage = document.createElement('div');
    this.stage.className = 'hud-stage village-ui';
    this.stage.innerHTML = `
      <section class="village-vitals" aria-label="角色属性">
        <span class="village-kicker">MISTBOUND · 青石村</span>
        <div class="village-vitals-line"><strong data-village="level">境 1</strong><span>气血 <b data-village="hp">120 / 120</b></span></div>
        <div class="village-meter"><span data-village="hp-bar"></span></div>
        <div class="village-exp"><span>修为</span><div><i data-village="exp-bar"></i></div><span data-village="exp">0 / 100</span></div>
      </section>
      <section class="village-heading" aria-label="当前区域">
        <span>故乡 · 安身之所</span><h1>青石村</h1>
        <p data-village="objective"></p>
        <button type="button" data-village-action="pause" aria-label="暂停游戏">暂歇 · ESC</button>
      </section>
      <section class="village-supplies" aria-label="携带物品"><span>回春散 <b data-village="potions">3</b></span><span>铜钱 <b data-village="gold">0</b></span></section>
      <section class="village-help"><span>A / D 行走</span><span>SPACE 跳跃</span><span>J / K 练招</span><span>SHIFT 掠影</span><span>E 交互</span></section>
      <div class="village-tutorial" data-village="tutorial" hidden></div>
      <div class="village-interaction" data-village="interaction" hidden></div>
      <div class="village-toast" data-village="toast" role="status" aria-live="polite"></div>
      <div class="village-title" data-village="area-title"><span>故乡</span><strong>青石村</strong><small>QINGSHI VILLAGE</small></div>
      <pre class="village-debug" data-village="debug" hidden></pre>
      <div class="village-modal-backdrop" data-village="dialogue-modal" hidden>
        <section class="village-dialogue" role="dialog" aria-modal="true" aria-label="人物对话">
          <span class="village-dialogue-speaker" data-village="speaker"></span><p data-village="line"></p>
          <button type="button" data-village-action="next">继续 <span>E / SPACE</span></button>
          <span class="village-dialogue-count" data-village="dialogue-count"></span>
        </section>
      </div>
      <div class="village-modal-backdrop" data-village="shop-modal" hidden>
        <section class="village-shop" role="dialog" aria-modal="true" aria-label="柳娘的杂货摊">
          <div class="village-shop-head"><div><span>青石村 · 柳娘</span><h2>山行备物</h2><p>入山之前，记得备药。</p></div><button type="button" data-village-action="close" aria-label="关闭商店">×</button></div>
          <div class="village-shop-balance"><span>现有铜钱 <strong data-village="shop-gold">0</strong></span><span>回春散 <strong data-village="shop-potions">0</strong></span></div>
          <div class="village-shop-items" data-village="shop-items"></div>
          <p class="village-shop-foot">ESC 返回村庄</p>
        </section>
      </div>
      <div class="village-modal-backdrop" data-village="pause-modal" hidden>
        <section class="village-pause" role="dialog" aria-modal="true" aria-label="暂停"><span>青石村</span><h2>暂歇片刻</h2><p>灯火守着归路。</p><button type="button" data-village-action="resume">继续行路</button><small>ESC 返回村庄</small></section>
      </div>`;
    this.root.replaceChildren(this.stage);
    this.stage.querySelectorAll<HTMLElement>('[data-village]').forEach(node => this.nodes.set(node.dataset.village ?? '', node));
    this.stage.addEventListener('click', event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>('button[data-village-action]');
      if (!button) return;
      switch (button.dataset.villageAction) {
        case 'pause': this.actions.onPause(); break;
        case 'resume': this.actions.onResume(); break;
        case 'close': this.actions.onClose(); break;
        case 'next': this.actions.onDialogueNext(); break;
        case 'buy': if (button.dataset.itemId) this.actions.onBuy(button.dataset.itemId); break;
      }
    }, { signal: this.listeners.signal });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(root);
    this.resize();
    const titleTimer = window.setTimeout(() => {
      this.node('area-title').classList.add('is-fading');
      this.notificationTimers.delete(titleTimer);
    }, 1700);
    this.notificationTimers.add(titleTimer);
  }

  update(state: VillageOverlayState): void {
    this.setText('level', `境 ${state.level}`);
    this.setText('hp', `${Math.ceil(state.hp)} / ${state.maxHp}`);
    this.node('hp-bar').style.width = `${pct(state.hp, state.maxHp)}%`;
    this.setText('exp', `${state.experience} / ${state.experienceToNext}`);
    this.node('exp-bar').style.width = `${pct(state.experience, state.experienceToNext)}%`;
    this.setText('gold', String(state.gold));
    this.setText('potions', String(state.potionCount));
    this.setText('objective', state.objective);
    this.setText('shop-gold', String(state.gold));
    this.setText('shop-potions', String(state.potionCount));
    this.setText('tutorial', state.tutorialPrompt ?? '');
    this.node('tutorial').hidden = !state.tutorialPrompt;
    this.setText('interaction', state.interactionPrompt ?? '');
    this.node('interaction').hidden = !state.interactionPrompt || state.mode !== 'gameplay';
    this.setText('debug', state.debug ?? '');
    this.node('debug').hidden = !state.debug;
    if (state.dialogue) {
      this.setText('speaker', state.dialogue.speaker);
      this.setText('line', state.dialogue.text);
      this.setText('dialogue-count', `${state.dialogue.index + 1} / ${state.dialogue.total}`);
    }
    if (state.mode === 'shop') {
      const items = state.shopItems ?? [];
      const signature = JSON.stringify(items);
      if (signature !== this.shopSignature) { this.renderShop(items); this.shopSignature = signature; }
    }
    this.showMode(state.mode);
    this.stage.dataset.phase = state.phase;
  }

  notify(message: string, kind: 'info' | 'success' | 'danger' = 'info'): void {
    const toast = document.createElement('p');
    toast.className = `village-toast-line ${kind}`;
    toast.textContent = message;
    const holder = this.node('toast');
    holder.append(toast);
    while (holder.childElementCount > 3) holder.firstElementChild?.remove();
    const timer = window.setTimeout(() => { toast.remove(); this.notificationTimers.delete(timer); }, 3400);
    this.notificationTimers.add(timer);
  }

  destroy(): void {
    this.listeners.abort();
    this.resizeObserver.disconnect();
    this.notificationTimers.forEach(timer => window.clearTimeout(timer));
    this.notificationTimers.clear();
    if (this.stage.contains(document.activeElement)) this.root.parentElement?.querySelector<HTMLElement>('#game-container')?.focus({ preventScroll: true });
    this.nodes.clear();
    this.stage.remove();
  }

  private renderShop(items: VillageShopCard[]): void {
    const holder = this.node('shop-items');
    holder.replaceChildren();
    for (const item of items) {
      const card = document.createElement('article');
      card.className = 'village-shop-card';
      const copy = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = item.name;
      const description = document.createElement('p');
      description.textContent = item.description;
      copy.append(name, description);
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.villageAction = 'buy';
      button.dataset.itemId = item.id;
      button.disabled = item.disabled;
      button.textContent = item.disabled && item.reason ? item.reason : `${item.price} 铜钱 · 购入`;
      card.append(copy, button);
      holder.append(card);
    }
  }

  private showMode(next: VillageMode): void {
    if (this.mode === next) return;
    const previous = this.mode;
    this.mode = next;
    for (const mode of ['dialogue', 'shop', 'pause'] as const) this.node(`${mode}-modal`).hidden = mode !== next && !(mode === 'pause' && next === 'paused');
    if (next === 'dialogue' || next === 'shop' || next === 'paused') {
      const key = next === 'paused' ? 'pause' : next;
      this.node(`${key}-modal`).querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    } else if (previous !== 'gameplay') this.root.parentElement?.querySelector<HTMLElement>('#game-container')?.focus({ preventScroll: true });
  }

  private setText(key: string, text: string): void { const node = this.node(key); if (node.textContent !== text) node.textContent = text; }
  private node(key: string): HTMLElement { const node = this.nodes.get(key); if (!node) throw new Error(`Missing village UI node ${key}`); return node; }
  private resize(): void { const bounds = this.root.getBoundingClientRect(); this.stage.style.transform = `scale(${Math.min(bounds.width / 1280, bounds.height / 720)})`; }
}
