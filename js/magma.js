/* js/magma.js - The Fiery Rain Engine */
export const magmaSettings = {
    rainOn: false,
    speed: 2,
    color: '#ff4500' 
};

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
let animationFrame;
const droplets = [];
const fontSize = 16;

export function initMagma() {
    canvas.id = 'magmaCanvas';
    // Position fixed so it stays behind the board
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '-1'; 
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);
    resizeMagma();
}

function resizeMagma() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const columns = Math.floor(canvas.width / fontSize);
    droplets.length = 0;
    for (let i = 0; i < columns; i++) droplets[i] = 1;
}

const MAGMA_TOUCH = matchMedia("(hover: none)").matches;
let magmaFrame = 0;
export function drawMagma() {
    // Phones: draw every 2nd frame and skip the canvas glow (shadowBlur is very costly on mobile GPUs)
    const lowGfx = window.__gfxTier === "low";
    const skip = lowGfx ? 4 : (MAGMA_TOUCH ? 2 : 1);
    if (skip > 1 && (++magmaFrame % skip)) { animationFrame = requestAnimationFrame(drawMagma); return; }
    if (!magmaSettings.rainOn) {
        canvas.style.display = 'none';
        return;
    }
    canvas.style.display = 'block';
    
    // Create the trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < droplets.length; i += (lowGfx ? 2 : 1)) {   // Low: half the embers
        const char = Math.random() > 0.9 ? '🔥' : '•'; 
        const x = i * fontSize;
        const y = droplets[i] * fontSize;

        ctx.shadowBlur = MAGMA_TOUCH ? 0 : 12;
        ctx.shadowColor = '#ff3300';
        ctx.fillStyle = magmaSettings.color;
        ctx.fillText(char, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
            droplets[i] = 0;
        }
        droplets[i] += magmaSettings.speed;
    }
    animationFrame = requestAnimationFrame(drawMagma);
}

export function stopMagma() {
    magmaSettings.rainOn = false;
    cancelAnimationFrame(animationFrame);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = 'none';
}