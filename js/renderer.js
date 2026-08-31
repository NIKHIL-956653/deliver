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
  for (let pi = 0; pi < 6; pi++) {
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
      if (x >= 0 && x < this.cols && y >= 0 && y < this.rows &&
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
  updateCell(x, y, data, colorStr) {
    const c = this.cells[y * this.cols + x];
    if (!c) return;
    c.state = { owner: data.owner, count: data.count, blocked: !!data.isBlocked, critical: !!data.critical };
    this._paintBase(c);
    c.content.removeChildren().forEach(ch => ch.destroy());
    if (c.state.blocked || data.count === 0) return;
    const tint = colorStr ? cssColor(colorStr) : this._ownerColor(data.owner);
    const cbMode = document.body.classList.contains("colorblind-mode");
    const mark = ow => {
      const m = new PIXI.Sprite(this.tex.marks[((ow % 6) + 6) % 6]);
      m.anchor.set(0.5); return m;
    };
    const mkOrb = scale => {
      // wrap orb + mark in a container so the mark is NOT distorted by the
      // orb sprite's own scaling (children inherit parent scale)
      const wrap = new PIXI.Container();
      const s = new PIXI.Sprite(this.tex.orb); s.anchor.set(0.5);
      s.width = s.height = this.size * scale; s.tint = tint;
      wrap.addChild(s);
      if (cbMode) {
        const m = mark(data.owner);
        m.width = m.height = this.size * scale * 0.6;
        wrap.addChild(m);
      }
      return wrap;
    };
    if (data.count >= 3) {
      const bomb = new PIXI.Sprite(this.tex.bomb); bomb.anchor.set(0.5);
      bomb.width = bomb.height = this.size * 1.05; bomb.tint = tint;
      const spark = new PIXI.Sprite(this.tex.spark); spark.anchor.set(0.5);
      spark.position.set(this.size * 0.18, -this.size * 0.42);
      spark.width = spark.height = this.size * 0.28;
      spark.__isSpark = true;
      c.content.addChild(bomb, spark);
      if (cbMode) {
        const m = mark(data.owner);
        m.width = m.height = this.size * 0.4;
        m.position.set(0, this.size * 0.05);
        c.content.addChild(m);
      }
    } else if (data.count === 2) {
      const a = mkOrb(0.44), b = mkOrb(0.44);
      a.x = -this.size * 0.22; b.x = this.size * 0.22;
      c.content.addChild(a, b);
    } else {
      c.content.addChild(mkOrb(0.72));
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
    const low = window.__gfxTier === "low";
    for (const c of this.cells) {
      if (!c) continue;
      if (c.popT > 0) { c.popT = Math.max(0, c.popT - dt * 0.12); c.root.scale.set(1 + 0.14 * Math.sin(Math.PI * (1 - c.popT))); }
      else if (c.pressT > 0) { c.root.scale.set(0.9); }
      else if (c.root.scale.x !== 1) c.root.scale.set(1);
      if (!low && c.state.count >= 3 && c.content.children.length) {
        const spark = c.content.children.find(ch => ch.__isSpark);
        if (spark) spark.alpha = 0.55 + 0.45 * Math.sin(this.t * 0.55 + c.x);
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
