// js/sharecard.js — victory card for WhatsApp / Instagram sharing.
// Draws a 1080×1080 PNG from the match result and hands it to the OS share
// sheet (navigator.share with files). Where that isn't supported the image is
// downloaded and the caption copied, so the player can still post it.

const SITE = "nikhil-956653.github.io/deliver";
const S = 1080;

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// darken a #rrggbb toward black by `k` (0 = black, 1 = unchanged)
function shade(hex, k) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
}

function orb(c, x, y, r, color) {
  c.save();
  c.shadowColor = color; c.shadowBlur = r * 1.8;
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.22, color);
  g.addColorStop(0.7, color);
  g.addColorStop(1, shade(color, 0.45));
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.restore();
}

/** Draw the card. result: { winnerName, winnerColor, players[{name,color}], mode, grid, moves, online } */
export function drawShareCard(result) {
  const cv = document.createElement("canvas");
  cv.width = S; cv.height = S;
  const c = cv.getContext("2d");
  const accent = result.winnerColor || "#00ffcc";

  // backdrop
  c.fillStyle = "#07070b"; c.fillRect(0, 0, S, S);
  const glow = c.createRadialGradient(S / 2, S * 0.42, 40, S / 2, S * 0.42, S * 0.62);
  glow.addColorStop(0, accent + "38");
  glow.addColorStop(1, "transparent");
  c.fillStyle = glow; c.fillRect(0, 0, S, S);

  // faint grid
  c.strokeStyle = "rgba(255,255,255,0.045)"; c.lineWidth = 2;
  for (let i = 1; i < 9; i++) {
    const p = (S / 9) * i;
    c.beginPath(); c.moveTo(p, 0); c.lineTo(p, S); c.stroke();
    c.beginPath(); c.moveTo(0, p); c.lineTo(S, p); c.stroke();
  }

  // frame
  c.strokeStyle = accent + "66"; c.lineWidth = 6;
  roundRect(c, 34, 34, S - 68, S - 68, 44); c.stroke();

  c.textAlign = "center";

  // title
  c.fillStyle = "rgba(255,255,255,0.55)";
  c.font = "600 34px system-ui, -apple-system, 'Segoe UI', sans-serif";
  c.letterSpacing = "10px";
  c.fillText("NEON CHAIN REACTION", S / 2, 132);
  c.letterSpacing = "0px";

  // orbs — winner centred and largest
  const others = (result.players || []).filter(p => p.color !== result.winnerColor).slice(0, 3);
  const cx = S / 2, oy = 300;
  others.forEach((p, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const step = 150 + Math.floor(i / 2) * 112;
    orb(c, cx + side * step, oy, 34, p.color);
  });
  orb(c, cx, oy, 62, accent);

  // winner
  c.fillStyle = "#ffffff";
  c.font = "800 96px system-ui, -apple-system, 'Segoe UI', sans-serif";
  const name = (result.winnerName || "Player").slice(0, 14);
  c.fillText(name, S / 2, 500);

  c.fillStyle = accent;
  c.font = "800 60px system-ui, -apple-system, 'Segoe UI', sans-serif";
  c.letterSpacing = "14px";
  c.fillText("WINS", S / 2, 578);
  c.letterSpacing = "0px";

  // stats pills
  const modeLabel = result.online ? "Online match" : result.mode === "timeAttack" ? "Time Attack" : result.mode === "saga" ? "Saga" : "Quick Match";
  const pills = [modeLabel, result.grid, `${result.moves} moves`].filter(Boolean);
  c.font = "600 34px system-ui, -apple-system, 'Segoe UI', sans-serif";
  const gap = 22;
  const widths = pills.map(t => c.measureText(t).width + 56);
  let x = (S - (widths.reduce((a, b) => a + b, 0) + gap * (pills.length - 1))) / 2;
  pills.forEach((t, i) => {
    c.fillStyle = "rgba(255,255,255,0.07)";
    roundRect(c, x, 648, widths[i], 74, 37); c.fill();
    c.strokeStyle = "rgba(255,255,255,0.14)"; c.lineWidth = 2; c.stroke();
    c.fillStyle = "rgba(255,255,255,0.86)";
    c.fillText(t, x + widths[i] / 2, 697);
    x += widths[i] + gap;
  });

  // player line-up
  if (result.players?.length > 1) {
    c.fillStyle = "rgba(255,255,255,0.4)";
    c.font = "500 30px system-ui, -apple-system, 'Segoe UI', sans-serif";
    c.fillText(result.players.map(p => p.name).join("  ·  ").slice(0, 60), S / 2, 800);
  }

  // footer
  c.fillStyle = accent;
  c.font = "700 40px system-ui, -apple-system, 'Segoe UI', sans-serif";
  c.fillText("Play free", S / 2, 916);
  c.fillStyle = "rgba(255,255,255,0.62)";
  c.font = "500 32px system-ui, -apple-system, 'Segoe UI', sans-serif";
  c.fillText(SITE, S / 2, 968);

  return cv;
}

const toBlob = cv => new Promise(res => cv.toBlob(res, "image/png"));

/** Share the result. Returns "shared" | "downloaded" | "cancelled" | "failed". */
export async function shareResult(result) {
  const caption = `${result.winnerName} won at Neon Chain Reaction 💥 ${result.grid} · ${result.moves} moves — play free: https://${SITE}`;
  let blob;
  try { blob = await toBlob(drawShareCard(result)); } catch { blob = null; }

  if (blob) {
    const file = new File([blob], "neon-win.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: caption });
        return "shared";
      } catch (e) {
        if (e?.name === "AbortError") return "cancelled";
      }
    }
  }
  // No file sharing (most desktops): try text share, else save the image.
  if (navigator.share) {
    try { await navigator.share({ text: caption }); return "shared"; }
    catch (e) { if (e?.name === "AbortError") return "cancelled"; }
  }
  if (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "neon-win.png";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    try { await navigator.clipboard?.writeText(caption); } catch {}
    return "downloaded";
  }
  return "failed";
}
