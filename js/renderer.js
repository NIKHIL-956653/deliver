// js/renderer.js — GPU board renderer (PixiJS / WebGL)
//
// Draws the board, cells, orbs and bombs as GPU sprites — the Candy Crush way:
// tintable white textures generated once, batched in a single draw pass, so a
// 100-wave chain costs the GPU barely more than an idle board.
//
// game.js talks to it through a small API (build / updateCell / pop / press /
// hint / lastMove / cellCenter / setTheme / resize). If WebGL is unavailable
// (or the player picks "Classic" in Settings), game.js keeps the DOM renderer —
// this file is an upgrade, never a requirement.

/* global PIXI */

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch { return false; }
}

function cssColor(str, fallback = 0xffffff) {
  try { return new PIXI.Color(str).toNumber(); } catch { return fallback; }
}
function cssAlpha(str) {
  try { return new PIXI.Color(str).alpha; } catch { return 1; }
}

// ── texture factory (white → tintable) ───────────────────────────────────────
function makeTextures(app, size) {
  const r = Math.min(10, size * 0.22);
  const t = {};

  const g = new PIXI.Graphics();
  g.beginFill(0xffffff).drawRoundedRect(0, 0, size, size, r).endFill();
  t.cell = app.renderer.generateTexture(g); g.destroy();

  const b = new PIXI.Graphics();
  b.lineStyle(2, 0xffffff, 1).drawRoundedRect(1, 1, size - 2, size - 2, r);
  t.border = app.renderer.generateTexture(b); b.destroy();

  const b3 = new PIXI.Graphics();
  b3.lineStyle(3, 0xffffff, 1).drawRoundedRect(1.5, 1.5, size - 3, size - 3, r);
  t.borderThick = app.renderer.generateTexture(b3); b3.destroy();

  // glossy orb, drawn on a 2D canvas for the gradient, white so tint = player colour
  const os = Math.max(24, Math.round(size * 1.2));
  const oc = document.createElement("canvas"); oc.width = oc.height = os;
  const c2 = oc.getContext("2d");
  const grad = c2.createRadialGradient(os * 0.38, os * 0.32, os * 0.05, os * 0.5, os * 0.5, os * 0.5);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.86)");
  grad.addColorStop(0.7, "rgba(200,200,200,0.95)");
  grad.addColorStop(1, "rgba(90,90,90,1)");
  c2.fillStyle = grad;
  c2.beginPath(); c2.arc(os / 2, os / 2, os / 2 - 1, 0, Math.PI * 2); c2.fill();
  c2.fillStyle = "rgba(255,255,255,0.85)";
  c2.beginPath(); c2.ellipse(os * 0.38, os * 0.3, os * 0.14, os * 0.09, -0.5, 0, Math.PI * 2); c2.fill();
  t.orb = PIXI.Texture.from(oc);

  // soft round glow (additive)
  const gs = os * 2;
  const gc = document.createElement("canvas"); gc.width = gc.height = gs;
  const g2 = gc.getContext("2d");
  const gg = g2.createRadialGradient(gs / 2, gs / 2, 0, gs / 2, gs / 2, gs / 2);
  gg.addColorStop(0, "rgba(255,255,255,0.55)");
  gg.addColorStop(0.5, "rgba(255,255,255,0.18)");
  gg.addColorStop(1, "rgba(255,255,255,0)");
  g2.fillStyle = gg; g2.fillRect(0, 0, gs, gs);
  t.glow = PIXI.Texture.from(gc);

  // bomb: white body with fuse notch (tinted), plus a spark dot
  const bs = os;
  const bc = document.createElement("canvas"); bc.width = bc.height = bs;
  const b2 = bc.getContext("2d");
  const bg = b2.createRadialGradient(bs * 0.4, bs * 0.42, bs * 0.05, bs * 0.5, bs * 0.55, bs * 0.45);
  bg.addColorStop(0, "rgba(255,255,255,1)");
  bg.addColorStop(0.6, "rgba(210,210,210,1)");
  bg.addColorStop(1, "rgba(80,80,80,1)");
  b2.fillStyle = bg;
  b2.beginPath(); b2.arc(bs * 0.5, bs * 0.55, bs * 0.37, 0, Math.PI * 2); b2.fill();
  b2.strokeStyle = "#bbb"; b2.lineWidth = Math.max(2, bs * 0.045); b2.lineCap = "round";
  b2.beginPath(); b2.moveTo(bs * 0.5, bs * 0.2); b2.quadraticCurveTo(bs * 0.5, bs * 0.06, bs * 0.68, bs * 0.08); b2.stroke();
  t.bomb = PIXI.Texture.from(bc);

  // colourblind marks — a distinct shape per player, high-contrast on any orb colour
  t.marks = [];
  for (let pi = 0; pi < 8; pi++) {
    const ms = 40;
    const mc = document.createElement("canvas"); mc.width = mc.height = ms;
    const m2 = mc.getContext("2d");
    m2.lineWidth = 5; m2.lineJoin = "round"; m2.lineCap = "round";
    m2.strokeStyle = "rgba(0,0,0,0.85)"; m2.fillStyle = "#ffffff";
    const cx = ms / 2, cy = ms / 2, q = ms * 0.30;
    const draw = fill => {
      m2.beginPath();
      switch (pi) {
        case 0: m2.arc(cx, cy, q * 0.75, 0, Math.PI * 2); break;                      // ● dot
        case 1: m2.rect(cx - q, cy - q * 0.85, q * 2, q * 0.55);                      // ☰ stripes
                m2.rect(cx - q, cy + q * 0.3, q * 2, q * 0.55); break;
        case 2: m2.moveTo(cx, cy - q); m2.lineTo(cx + q, cy + q * 0.8);               // ▲ triangle
                m2.lineTo(cx - q, cy + q * 0.8); m2.closePath(); break;
        case 3: m2.moveTo(cx, cy - q); m2.lineTo(cx + q, cy);                          // ◆ diamond
                m2.lineTo(cx, cy + q); m2.lineTo(cx - q, cy); m2.closePath(); break;
        case 4: m2.moveTo(cx - q, cy - q); m2.lineTo(cx + q, cy + q);                  // ✕ cross
                m2.moveTo(cx + q, cy - q); m2.lineTo(cx - q, cy + q); break;
        case 5: m2.arc(cx, cy, q * 0.8, 0, Math.PI * 2); break;                        // ◯ ring
        case 6: m2.rect(cx - q * 0.8, cy - q * 0.8, q * 1.6, q * 1.6); break;          // ■ square
        case 7: for (let k = 0; k < 5; k++) {                                          // ★ star
                  const a = -Math.PI / 2 + k * Math.PI * 2 / 5, bb = a + Math.PI / 5;
                  const x1 = cx + Math.cos(a) * q,        y1 = cy + Math.sin(a) * q;
                  const x2 = cx + Math.cos(bb) * q * 0.45, y2 = cy + Math.sin(bb) * q * 0.45;
                  if (k === 0) m2.moveTo(x1, y1); else m2.lineTo(x1, y1);
                  m2.lineTo(x2, y2);
                } m2.closePath(); break;
      }
      if (fill) { if (pi === 4) { m2.lineWidth = 7; m2.strokeStyle = "#fff"; m2.stroke(); } else if (pi === 5) { m2.lineWidth = 6; m2.strokeStyle = "#fff"; m2.stroke(); } else m2.fill(); }
      else { m2.stroke(); }
    };
    draw(false);   // dark outline first
    m2.lineWidth = 5; m2.strokeStyle = "rgba(0,0,0,0.85)";
    draw(true);    // white shape on top
    t.marks.push(PIXI.Texture.from(mc));
  }

  const sc = document.createElement("canvas"); sc.width = sc.height = 16;
  const s2 = sc.getContext("2d");
  const sg = s2.createRadialGradient(8, 8, 0, 8, 8, 8);
  sg.addColorStop(0, "rgba(255,255,255,1)"); sg.addColorStop(0.5, "rgba(255,200,80,0.9)"); sg.addColorStop(1, "rgba(255,140,0,0)");
  s2.fillStyle = sg; s2.fillRect(0, 0, 16, 16);
  t.spark = PIXI.Texture.from(sc);

  return t;
}

export class GPUBoard {
  static available() { return typeof PIXI !== "undefined" && webglAvailable(); }

  constructor(host, onTap) {
    this.host = host;                 // .board-container element
    this.onTap = onTap;               // (x, y) => void
    this.rows = 0; this.cols = 0; this.size = 48; this.gap = 4;
    this.cells = [];                  // per-cell {root,bg,border,glow,content,state}
    this.theme = { cellBg: 0x151515, cellBgA: 1, border: 0x333333, borderA: 0.6, primary: 0x47f2ff, wire: false };
    this.hintCell = null; this.lastMoveCell = null; this.pulseOwner = -1; this.players = [];
    this.t = 0;

    const dprCap = (window.__gfxTier === "low") ? 1 : (window.__gfxTier === "high" ? 2 : 1.5);
    this.app = new PIXI.Application({
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, dprCap),
      powerPreference: "high-performance",
    });
    this.app.view.id = "gpuBoard";
    this.app.view.style.touchAction = "none";
    this.board = new PIXI.Container();
    this.fxLayer = new PIXI.Container();      // pops/rings above cells
    this.app.stage.addChild(this.board, this.fxLayer);

    this.app.view.addEventListener("pointerdown", e => {
      const rect = this.app.view.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      const step = this.size + this.gap;
      const x = Math.floor(px / step), y = Math.floor(py / step);
      const cc = this.cells[y * this.cols + x];
      if (x >= 0 && x < this.cols && y >= 0 && y < this.rows && !(cc && cc.state && cc.state.hidden) &&
          px - x * step <= this.size && py - y * step <= this.size) {
        this.press(x, y, true);
        this.onTap(x, y, e);
      }
    }, { passive: true });
    const rel = () => this.cells.forEach(c => c && this._pressAnim(c, false));
    this.app.view.addEventListener("pointerup", rel, { passive: true });
    this.app.view.addEventListener("pointercancel", rel, { passive: true });

    this.app.ticker.add(dt => this._tick(dt));
  }

  mount() { if (!this.app.view.parentElement) this.host.appendChild(this.app.view); }
  unmount() { this.app.view.remove(); }
  destroy() { this.app.destroy(true, { children: true, texture: true, baseTexture: true }); }

  // ── grid ───────────────────────────────────────────────────────────────────
  build(rows, cols, size) {
    this.rows = rows; this.cols = cols;
    this._setSize(size);
    this.board.removeChildren().forEach(c => c.destroy({ children: true }));
    this.fxLayer.removeChildren().forEach(c => c.destroy({ children: true }));
    this.pcont = null; this.pool = null;          // pooled particles died with fxLayer
    this.cells = new Array(rows * cols);
    const step = this.size + this.gap;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const root = new PIXI.Container();
        root.position.set(x * step + this.size / 2, y * step + this.size / 2);
        const mk = tex => { const s = new PIXI.Sprite(tex); s.anchor.set(0.5); return s; };
        const bg = mk(this.tex.cell);
        const glow = mk(this.tex.glow); glow.blendMode = PIXI.BLEND_MODES.ADD; glow.visible = false; glow.scale.set((this.size * 1.6) / glow.texture.width);
        const border = mk(this.tex.border);
        const lastMv = mk(this.tex.borderThick); lastMv.tint = 0xffd700; lastMv.visible = false;
        const content = new PIXI.Container();
        root.addChild(glow, bg, border, content, lastMv);
        this.board.addChild(root);
        this.cells[y * cols + x] = { root, bg, border, glow, content, lastMv, x, y,
          state: { owner: -1, count: 0, blocked: false, critical: false }, pressT: 0, popT: 0 };
      }
    }
    this.applyTheme();
    this.mount();
  }

  _setSize(size) {
    this.size = size;
    this.gap = 4;
    const w = this.cols * size + (this.cols - 1) * this.gap;
    const h = this.rows * size + (this.rows - 1) * this.gap;
    this.app.renderer.resize(w, h);
    this.app.view.style.width = w + "px";
    this.app.view.style.height = h + "px";
    if (this.tex) for (const t of Object.values(this.tex)) {
      if (Array.isArray(t)) t.forEach(x => x?.destroy?.(true));
      else t?.destroy?.(true);
    }
    this.tex = makeTextures(this.app, size);
  }

  resize(size) {
    if (!this.rows) return;
    const snap = this.cells.map(c => ({ ...c.state }));
    this.build(this.rows, this.cols, size);
    snap.forEach((s, i) => this.updateCell(i % this.cols, Math.floor(i / this.cols), s, this._ownerColor(s.owner)));
  }

  setPlayers(players) { this.players = players || []; }
  _ownerColor(owner) {
    const c = this.players[owner]?.color;
    return c ? cssColor(c) : 0xcccccc;
  }

  // ── theme ──────────────────────────────────────────────────────────────────
  applyTheme() {
    const cs = getComputedStyle(document.body);
    const wire = document.body.classList.contains("board-wire");
    const cellBg = cs.getPropertyValue("--cell-bg").trim() || "#151515";
    const borderC = cs.getPropertyValue("--border-color").trim() || "#ffffff22";
    const primary = cs.getPropertyValue("--primary").trim() || "#47f2ff";
    this.theme = {
      wire,
      cellBg: cssColor(cellBg), cellBgA: wire ? 0 : cssAlpha(cellBg),
      border: wire ? cssColor(primary) : cssColor(borderC),
      borderA: wire ? 0.85 : Math.max(0.35, cssAlpha(borderC)),
      primary: cssColor(primary),
    };
    for (const c of this.cells) if (c) this._paintBase(c);
  }

  _paintBase(c) {
    const s = c.state, th = this.theme;
    if (s.hidden) {                       // custom-board hole: no tile, no border
      c.bg.visible = false; c.border.visible = false; c.glow.visible = false;
      c.lastMv.visible = false;
      return;
    }
    c.border.visible = true;
    if (s.blocked) {
      c.bg.visible = true; c.bg.tint = 0x0a0a0a; c.bg.alpha = th.wire ? 0.5 : 0.9;
      c.border.tint = th.border; c.border.alpha = 0.25;
      return;
    }
    c.bg.visible = !th.wire;
    c.bg.tint = th.cellBg; c.bg.alpha = th.cellBgA;
    if (s.critical) { c.border.tint = 0xff3b3b; c.border.alpha = 1; }
    else if (s.owner !== -1) { c.border.tint = this._ownerColor(s.owner); c.border.alpha = 0.9; }
    else { c.border.tint = th.border; c.border.alpha = th.borderA; }
    c.glow.visible = s.owner !== -1 && !th.wire;
    if (c.glow.visible) { c.glow.tint = this._ownerColor(s.owner); c.glow.alpha = 0.35; }
  }

  // ── cell content ───────────────────────────────────────────────────────────
  // Settings → Orb Size, read from the same CSS variable the DOM renderer uses.
  orbScale() {
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--orb-scale"));
    return isFinite(v) && v > 0 ? v : 1;
  }

  /** Repaint every cell — used when orb size changes mid-match. */
  refreshAll() {
    for (const c of this.cells) {
      if (!c || !c.state) continue;
      this.updateCell(c.x, c.y, { owner: c.state.owner, count: c.state.count, isBlocked: c.state.blocked, critical: c.state.critical },
                      this._ownerColor(c.state.owner));
    }
  }

  // Per-cell sprite pool. Built once, then only toggled/resized/tinted — a long
  // chain used to destroy and re-create hundreds of sprites per second, and the
  // garbage collection behind that is what made big blasts stutter.
  _ensureParts(c) {
    if (c.parts) return c.parts;
    const mkWrap = () => {
      const wrap = new PIXI.Container();
      const s = new PIXI.Sprite(this.tex.orb); s.anchor.set(0.5);
      const m = new PIXI.Sprite(this.tex.marks[0]); m.anchor.set(0.5); m.visible = false;
      wrap.addChild(s, m);
      wrap.visible = false;
      return { wrap, s, m };
    };
    const o1 = mkWrap(), o2 = mkWrap();
    const bomb = new PIXI.Sprite(this.tex.bomb); bomb.anchor.set(0.5); bomb.visible = false;
    const spark = new PIXI.Sprite(this.tex.spark); spark.anchor.set(0.5); spark.visible = false;
    const bmark = new PIXI.Sprite(this.tex.marks[0]); bmark.anchor.set(0.5); bmark.visible = false;
    c.content.addChild(o1.wrap, o2.wrap, bomb, spark, bmark);
    c.parts = { o1, o2, bomb, spark, bmark };
    c.spark = spark;
    return c.parts;
  }

  updateCell(x, y, data, colorStr) {
    const c = this.cells[y * this.cols + x];
    if (!c) return;
    c.state = { owner: data.owner, count: data.count, blocked: !!data.isBlocked, critical: !!data.critical, hidden: !!data.hidden };
    this._paintBase(c);
    const P = this._ensureParts(c);

    if (c.state.hidden || c.state.blocked || data.count === 0) {
      P.o1.wrap.visible = P.o2.wrap.visible = P.bomb.visible = P.spark.visible = P.bmark.visible = false;
      return;
    }

    const tint = colorStr ? cssColor(colorStr) : this._ownerColor(data.owner);
    const cb = document.body.classList.contains("colorblind-mode") ||
               document.body.classList.contains("many-players");   // 5+ seats: shapes always
    const oS = this.orbScale();
    const M = this.tex.marks.length;
    const markTex = this.tex.marks[((data.owner % M) + M) % M];

    const setOrb = (o, scale, px) => {
      o.wrap.visible = true;
      o.wrap.x = px;
      o.s.width = o.s.height = this.size * scale * oS;
      o.s.tint = tint;
      o.m.visible = cb;
      if (cb) {
        o.m.texture = markTex;
        o.m.width = o.m.height = this.size * scale * oS * 0.6;
      }
    };

    if (data.count >= 3) {
      P.o1.wrap.visible = P.o2.wrap.visible = false;
      P.bomb.visible = true;
      P.bomb.width = P.bomb.height = this.size * 1.05 * oS;
      P.bomb.tint = tint;
      P.spark.visible = true;
      P.spark.position.set(this.size * 0.18, -this.size * 0.42);
      P.spark.width = P.spark.height = this.size * 0.28;
      P.bmark.visible = cb;
      if (cb) {
        P.bmark.texture = markTex;
        P.bmark.width = P.bmark.height = this.size * 0.4;
        P.bmark.position.set(0, this.size * 0.05);
      }
    } else if (data.count === 2) {
      P.bomb.visible = P.spark.visible = P.bmark.visible = false;
      setOrb(P.o1, 0.44, -this.size * 0.22);
      setOrb(P.o2, 0.44, this.size * 0.22);
    } else {
      P.bomb.visible = P.spark.visible = P.bmark.visible = false;
      P.o2.wrap.visible = false;
      setOrb(P.o1, 0.72, 0);
    }
  }

  // ── GPU PARTICLES ──────────────────────────────────────────────────────────
  // Blast sparks as pooled sprites inside the board's own WebGL layer. The old
  // path drew them on a separate full-screen 2D canvas, so every frame of a
  // chain composited two full-screen layers; this draws them in one batch.
  _ensureParticles() {
    if (this.pcont) return;
    const cap = window.__gfxTier === "low" ? 180 : window.__gfxTier === "high" ? 700 : 420;
    this.pcont = new PIXI.ParticleContainer(cap, { position: true, scale: true, tint: true, alpha: true });
    this.fxLayer.addChild(this.pcont);
    this.pool = [];
    for (let i = 0; i < cap; i++) {
      const s = new PIXI.Sprite(this.tex.orb);
      s.anchor.set(0.5); s.visible = false;
      this.pcont.addChild(s);
      this.pool.push({ s, life: 0, vx: 0, vy: 0, decay: 0.02 });
    }
    this.pHead = 0;
  }

  /** Spark burst at a SCREEN position (same coordinates the DOM path uses). */
  burst(screenX, screenY, colorStr, count) {
    this._ensureParticles();
    const n = count || (window.__gfxTier === "low" ? 6 : window.__gfxTier === "high" ? 22 : 12);
    const rect = this.app.view.getBoundingClientRect();
    const x = screenX - rect.left, y = screenY - rect.top;
    const tint = cssColor(colorStr);
    for (let i = 0; i < n; i++) {
      this.pHead = (this.pHead + 1) % this.pool.length;
      const p = this.pool[this.pHead];
      const a = Math.random() * Math.PI * 2, v = 1.6 + Math.random() * 3.4;
      p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v;
      p.life = 1; p.decay = 0.02 + Math.random() * 0.025;
      const sz = Math.max(3, this.size * (0.09 + Math.random() * 0.06));
      p.s.width = p.s.height = sz;
      p.s.tint = tint; p.s.alpha = 1; p.s.visible = true;
      p.s.position.set(x, y);
    }
  }

  _tickParticles(dt) {
    if (!this.pool) return;
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= p.decay * dt;
      if (p.life <= 0) { p.s.visible = false; continue; }
      p.s.x += p.vx * dt;
      p.s.y += p.vy * dt;
      p.vy += 0.14 * dt;                 // gravity
      p.vx *= 0.985; p.vy *= 0.985;
      p.s.alpha = p.life;
    }
  }

  // ── effects ────────────────────────────────────────────────────────────────
  pop(x, y) { const c = this.cells[y * this.cols + x]; if (c) c.popT = 1; }
  press(x, y, on) { const c = this.cells[y * this.cols + x]; if (c) this._pressAnim(c, on); }
  _pressAnim(c, on) { c.pressT = on ? 1 : 0; if (!on) c.root.scale.set(1); }

  lastMove(x, y) {
    if (this.lastMoveCell) this.lastMoveCell.lastMv.visible = false;
    const c = x >= 0 ? this.cells[y * this.cols + x] : null;
    this.lastMoveCell = c || null;
    if (c) c.lastMv.visible = true;
  }

  hint(x, y) {
    this.hintCell = this.cells[y * this.cols + x] || null;
    this.board.alpha = 1;
    for (const c of this.cells) if (c) c.root.alpha = (c === this.hintCell) ? 1 : 0.25;
  }
  clearHint() {
    if (this.hintCell) {
      this.hintCell.root.scale.set(1);
      this.hintCell.lastMv.visible = (this.hintCell === this.lastMoveCell);
      this.hintCell.lastMv.alpha = 1;
    }
    this.hintCell = null;
    for (const c of this.cells) if (c) c.root.alpha = 1;
  }

  setPulseOwner(owner) { this.pulseOwner = (window.__gfxTier === "high") ? owner : -1; }

  cellCenter(x, y) {
    const rect = this.app.view.getBoundingClientRect();
    const step = this.size + this.gap;
    return [rect.left + x * step + this.size / 2, rect.top + y * step + this.size / 2];
  }

  // ── ticker ─────────────────────────────────────────────────────────────────
  _tick(dt) {
    this.t += dt;
    this._tickParticles(dt);
    const low = window.__gfxTier === "low";
    for (const c of this.cells) {
      if (!c) continue;
      if (c.popT > 0) { c.popT = Math.max(0, c.popT - dt * 0.12); c.root.scale.set(1 + 0.14 * Math.sin(Math.PI * (1 - c.popT))); }
      else if (c.pressT > 0) { c.root.scale.set(0.9); }
      else if (c.root.scale.x !== 1) c.root.scale.set(1);
      if (!low && c.state.count >= 3 && c.spark) {
        c.spark.alpha = 0.55 + 0.45 * Math.sin(this.t * 0.55 + c.x);
        if (window.__gfxTier === "high") c.content.rotation = 0.02 * Math.sin(this.t * 0.5 + c.y);
      }
      if (this.pulseOwner >= 0 && c.state.owner === this.pulseOwner && c.glow.visible) {
        c.glow.alpha = 0.3 + 0.15 * Math.sin(this.t * 0.1 + (c.x + c.y));
      }
    }
    if (this.hintCell) {
      const k = 1 + 0.1 * Math.sin(this.t * 0.25);
      this.hintCell.root.scale.set(k);
      this.hintCell.lastMv.visible = true;
      this.hintCell.lastMv.alpha = 0.7 + 0.3 * Math.sin(this.t * 0.3);
    }
  }
}
