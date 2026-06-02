const ctaIcon = document.getElementById('cta-icon');
const ctaFace = document.getElementById('cta-face');
const ctaSheen = document.getElementById('cta-sheen');
const ctaShadow = document.getElementById('cta-shadow');

const MAX_TILT = 25;
const LAYERS = 20;
const LAYER_DEPTH = 1.2;
const TOTAL_DEPTH = LAYERS * LAYER_DEPTH;

for (let i = 0; i < LAYERS; i++) {
  const img = document.createElement('img');
  img.src = ctaFace.src;
  img.className = 'icon-layer';
  const z = i * LAYER_DEPTH;
  const brightness = 0.12 + (i / LAYERS) * 0.38;
  img.style.cssText = `transform:translateZ(${z}px);filter:brightness(${brightness}) saturate(0.6)`;
  ctaIcon.insertBefore(img, ctaFace);
}

ctaFace.style.transform = `translateZ(${TOTAL_DEPTH}px)`;
ctaSheen.style.transform = `translateZ(${TOTAL_DEPTH + 0.5}px)`;

let currentX = 0, currentY = 0, targetX = 0, targetY = 0;
let isDragging = false, dragStartX = 0, dragStartY = 0, dragBaseX = 0, dragBaseY = 0;
const DRAG_SPEED = 0.5;
const MAX_DRAG = 85;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

ctaIcon.addEventListener('mousedown', (e) => {
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragBaseX = currentX;
  dragBaseY = currentY;
  ctaIcon.classList.add('dragging');
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    targetX = clamp(dragBaseX - (e.clientY - dragStartY) * DRAG_SPEED, -MAX_DRAG, MAX_DRAG);
    targetY = clamp(dragBaseY + (e.clientX - dragStartX) * DRAG_SPEED, -MAX_DRAG, MAX_DRAG);
  } else {
    targetY = clamp((e.clientX / innerWidth - 0.5) * MAX_TILT * 2, -MAX_TILT, MAX_TILT);
    targetX = clamp(-(e.clientY / innerHeight - 0.5) * MAX_TILT * 2, -MAX_TILT, MAX_TILT);
  }
});

document.addEventListener('mouseup', () => {
  isDragging = false;
  ctaIcon.classList.remove('dragging');
});

document.addEventListener('mouseleave', () => {
  if (!isDragging) { targetX = 0; targetY = 0; }
});

(function animate() {
  currentX += (targetX - currentX) * 0.1;
  currentY += (targetY - currentY) * 0.1;

  ctaIcon.style.transform = `rotateX(${currentX}deg) rotateY(${currentY}deg)`;

  const sx = 40 - (currentY / MAX_TILT) * 28;
  const sy = 32 - (currentX / MAX_TILT) * 28;
  ctaSheen.style.background =
    `radial-gradient(circle at ${sx}% ${sy}%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.05) 40%, transparent 65%)`;

  const tilt = Math.hypot(currentX, currentY) / MAX_TILT;
  ctaShadow.style.filter = `blur(${8 + tilt * 14}px)`;
  ctaShadow.style.opacity = 0.4 + tilt * 0.25;
  ctaShadow.style.transform = `translateX(calc(-50% + ${(currentY / MAX_TILT) * 10}px)) scaleX(${1 - tilt * 0.15})`;

  requestAnimationFrame(animate);
})();

const backdrop = document.getElementById('modalBackdrop');
document.getElementById('hintsBtn')?.addEventListener('click', () => backdrop.classList.add('open'));
document.getElementById('modalClose').addEventListener('click', () => backdrop.classList.remove('open'));
backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.classList.remove('open'); });

// Slider
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.slide-dot');
if (slides.length) {
  let current = 0;
  let timer;

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function start() { timer = setInterval(() => goTo(current + 1), 3500); }
  function stop() { clearInterval(timer); }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { goTo(i); stop(); start(); });
  });

  const preview = document.querySelector('.app-preview');
  preview.addEventListener('mouseenter', stop);
  preview.addEventListener('mouseleave', start);

  start();
}

const rows = document.querySelectorAll('.shortcut-row');

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { backdrop.classList.remove('open'); return; }

  const { key, metaKey, shiftKey } = e;
  let matched = null;

  for (const row of rows) {
    const rk = row.dataset.key;
    const rMeta = row.hasAttribute('data-meta');
    const rShift = row.hasAttribute('data-shift');

    if (rMeta !== metaKey) continue;

    if (row.hasAttribute('data-digit')) {
      if (metaKey && !shiftKey && /^[1-9]$/.test(key)) { matched = row; break; }
      continue;
    }

    if (row.hasAttribute('data-arrow')) {
      if (key === rk && (rShift ? shiftKey : !shiftKey) && !metaKey) { matched = row; break; }
      continue;
    }

    if (key.toLowerCase() === rk.toLowerCase() && (rShift ? shiftKey : !shiftKey)) {
      matched = row;
      break;
    }
  }

  if (matched) {
    if (!['w', 't'].includes(key.toLowerCase())) e.preventDefault();
    matched.classList.add('flash');
    setTimeout(() => matched.classList.remove('flash'), 600);
    matched.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});
