// js/matrix.js
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
let animationId;

// --- SPEED CONTROL ---
let frameCount = 0;
let speedLimit = 5; // INCREASE this to make rain SLOWER (1 = Max speed, 3 = Chill/Sexy)

export const matrixSettings = {
    rainOn: true,
    japaneseOn: true,
    flashOn: true,
    isFlashing: false
};

const binary = "01";
const japanese = "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズヅブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン";

export function initMatrix() {
    canvas.id = 'matrixCanvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '-1'; 
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const fontSize = 18;
    const columns = Math.floor(canvas.width / fontSize);
    window.drops = Array(columns).fill(1); // Maintain positions globally
}

const fontSize = 18;

export function drawMatrix() {
    // --- THE SPEED BRAKE ---
    // This skips frames to slow down the animation
    frameCount++;
    if (frameCount < speedLimit) {
        animationId = requestAnimationFrame(drawMatrix);
        return;
    }
    frameCount = 0; // Reset for the next cycle

    if (!matrixSettings.rainOn) {
        ctx.fillStyle = "rgba(0, 0, 0, 1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        animationId = requestAnimationFrame(drawMatrix);
        return;
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Switch to White surge if "Flash: ON" and a blast happened
    ctx.fillStyle = matrixSettings.isFlashing ? "#fff" : "#00ff41";
    ctx.font = fontSize + "px monospace";

    for (let i = 0; i < window.drops.length; i++) {
        const charset = matrixSettings.japaneseOn ? japanese : binary;
        const text = charset.charAt(Math.floor(Math.random() * charset.length));
        ctx.fillText(text, i * fontSize, window.drops[i] * fontSize);
        
        if (window.drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            window.drops[i] = 0;
        }
        window.drops[i]++;
    }
    animationId = requestAnimationFrame(drawMatrix);
}

export function stopMatrix() {
    cancelAnimationFrame(animationId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function triggerMatrixFlash() {
    if (!matrixSettings.flashOn) return;
    matrixSettings.isFlashing = true;
    setTimeout(() => matrixSettings.isFlashing = false, 100); 
}