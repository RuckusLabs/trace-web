// The Trace window moves over the design editor; its comparison surface stays transparent.
const scene = document.getElementById('desktop-scene');
const traceWindow = document.getElementById('trace-window');
const artboard = document.getElementById('design-artboard');
const overlay = document.getElementById('reference-overlay');
const overlayImage = document.getElementById('overlay-image');
if (scene && traceWindow && artboard && overlay && overlayImage) {
  let x = 0, y = 0, drag = null, paint = 0, settleTimer = 0, placed = false;
  let anchorX = 0, anchorY = 0;
  let minX = 0, minY = 0, maxX = 0, maxY = 0;
  const inversion = document.getElementById('inversion');
  const translucence = document.getElementById('translucence');
  const hint = document.getElementById('frame-hint');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function clampPosition() {
    x = Math.max(minX, Math.min(maxX, x));
    y = Math.max(minY, Math.min(maxY, y));
  }
  function renderPosition() {
    paint = 0;
    traceWindow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }
  function schedulePosition() { if (!paint) paint = requestAnimationFrame(renderPosition); }
  function stopSettling() { clearTimeout(settleTimer); traceWindow.classList.remove('settling'); }
  function describe() {
    hint.textContent = inversion.checked && translucence.checked
      ? 'Drag the floating Trace window to line up the design. Toggle Invert or 50% blend to see the comparison change.'
      : 'Drag the floating Trace window over the design, then toggle Invert and 50% blend to compare.';
  }
  function updateModes() {
    overlay.classList.toggle('is-inverted', inversion.checked);
    overlay.style.opacity = translucence.checked ? '0.5' : '1';
    overlayImage.alt = inversion.checked ? 'Inverted reference in the floating Trace window' : 'Reference in the floating Trace window';
    describe();
  }
  function placeWindows() {
    const sceneRect = scene.getBoundingClientRect();
    const target = artboard.getBoundingClientRect();
    traceWindow.style.width = `${target.width + 2}px`;
    anchorX = target.left - sceneRect.left - 1;
    anchorY = target.top - sceneRect.top - document.getElementById('trace-drag-handle').offsetHeight - 1;
    traceWindow.style.left = `${anchorX}px`;
    traceWindow.style.top = `${anchorY}px`;
    // Cache geometry on resize; pointer movement only updates a compositor transform.
    minX = 10 - anchorX; minY = 32 - anchorY;
    maxX = scene.clientWidth - target.width - 2 - anchorX - 10;
    maxY = scene.clientHeight - target.height - document.getElementById('trace-drag-handle').offsetHeight - 2 - anchorY - 10;
    if (!placed) { x = scene.clientWidth * .085; y = scene.clientHeight * .065; placed = true; }
    clampPosition();
    schedulePosition();
  }
  traceWindow.addEventListener('pointerdown', event => {
    if (event.button !== 0 || drag) return;
    stopSettling();
    drag = { pointer: event.pointerId, startX: event.clientX, startY: event.clientY, x, y };
    traceWindow.setPointerCapture(event.pointerId);
    traceWindow.focus({ preventScroll: true });
    traceWindow.classList.add('dragging');
    event.preventDefault();
  });
  traceWindow.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointer) return;
    x = drag.x + event.clientX - drag.startX;
    y = drag.y + event.clientY - drag.startY;
    clampPosition();
    schedulePosition();
  });
  function endDrag(event) {
    if (!drag || drag.pointer !== event.pointerId) return;
    drag = null;
    traceWindow.classList.remove('dragging');
    describe();
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) traceWindow.addEventListener(type, endDrag);
  traceWindow.addEventListener('keydown', event => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const deltas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!deltas[event.key]) return;
    event.preventDefault();
    stopSettling();
    const step = event.shiftKey ? 10 : 1;
    x += deltas[event.key][0] * step;
    y += deltas[event.key][1] * step;
    clampPosition();
    schedulePosition();
  });
  inversion.addEventListener('change', updateModes);
  translucence.addEventListener('change', updateModes);
  document.getElementById('reset-overlay').addEventListener('click', () => {
    stopSettling();
    if (!reducedMotion.matches) { traceWindow.classList.add('settling'); settleTimer = setTimeout(stopSettling, 380); }
    x = 0; y = 0;
    schedulePosition();
    hint.textContent = inversion.checked && translucence.checked
      ? 'Windows aligned. Drag Trace to explore, or toggle Invert and 50% blend to change the comparison.'
      : 'Windows aligned. Toggle Invert to inspect the shifted heading, or drag Trace to move it again.';
  });
  new ResizeObserver(placeWindows).observe(scene);
  Promise.all(['sample-build', 'reference-content', 'inverted-content'].map(name => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => image.decode().then(resolve, reject);
    image.onerror = reject;
    image.src = `images/screens/${name}.webp`;
  }))).then(() => {
    placeWindows(); updateModes();
    document.getElementById('frame-controls').hidden = false;
  }).catch(() => { /* The two-window desktop remains visible without controls. */ });
}

// Restore the original layered 3D icon, with pointer/touch support and idle frames paused.
const icon = document.getElementById('cta-icon');
const face = document.getElementById('cta-face');
if (icon && face) {
  const sheen = document.getElementById('cta-sheen');
  const shadow = document.getElementById('cta-shadow');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Solid body slices create an actual extruded edge behind the original icon face.
  for (let i = 0; i < 20; i++) {
    const layer = document.createElement('div');
    layer.setAttribute('aria-hidden', 'true');
    layer.className = 'icon-layer icon-body';
    layer.style.transform = `translateZ(${-24 + i * 1.2}px)`;
    const lightness = 30 + i * .9;
    layer.style.background = `linear-gradient(135deg, hsl(224 78% ${lightness + 12}%), hsl(238 76% ${lightness}%))`;
    icon.insertBefore(layer, face);
  }
  face.style.transform = 'translateZ(0px)';
  sheen.style.transform = 'translateZ(.5px)';
  const restingX = -18, restingY = -34;
  let currentX = restingX, currentY = restingY, targetX = restingX, targetY = restingY, frame = 0;
  icon.style.transform = `rotateX(${restingX}deg) rotateY(${restingY}deg)`;
  let visible = false, drag = null;
  const clamp = (value, max) => Math.max(-max, Math.min(max, value));
  function animate() {
    frame = 0;
    currentX += (targetX - currentX) * .1;
    currentY += (targetY - currentY) * .1;
    icon.style.transform = `rotateX(${currentX}deg) rotateY(${currentY}deg)`;
    const tilt = Math.min(1, Math.hypot(currentX, currentY) / 25);
    sheen.style.background = `radial-gradient(circle at ${40 - currentY / 25 * 28}% ${32 - currentX / 25 * 28}%, rgba(255,255,255,.28), transparent 65%)`;
    shadow.style.filter = `blur(${8 + tilt * 14}px)`;
    shadow.style.opacity = .4 + tilt * .25;
    shadow.style.transform = `translateX(${currentY / 25 * 10}px) scaleX(${1 - tilt * .15})`;
    if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > .05) frame = requestAnimationFrame(animate);
  }
  function schedule() { if (!frame && !motion.matches) frame = requestAnimationFrame(animate); }
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }).observe(icon);
  document.addEventListener('pointermove', event => {
    if (!visible || motion.matches) return;
    if (drag) {
      targetX = clamp(drag.x - (event.clientY - drag.startY) * .5, 85);
      targetY = clamp(drag.y + (event.clientX - drag.startX) * .5, 85);
    } else if (event.pointerType === 'mouse') {
      targetX = restingX + clamp(-(event.clientY / innerHeight - .5) * 24, 12);
      targetY = restingY + clamp((event.clientX / innerWidth - .5) * 36, 18);
    }
    schedule();
  });
  icon.addEventListener('pointerdown', event => {
    if (motion.matches || event.button !== 0) return;
    drag = { startX: event.clientX, startY: event.clientY, x: currentX, y: currentY };
    icon.setPointerCapture(event.pointerId); icon.classList.add('dragging'); event.preventDefault();
  });
  function release() { drag = null; icon.classList.remove('dragging'); targetX = restingX; targetY = restingY; schedule(); }
  icon.addEventListener('pointerup', release);
  icon.addEventListener('pointercancel', release);
  icon.addEventListener('lostpointercapture', release);
  document.addEventListener('pointerleave', release);
  motion.addEventListener('change', () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; currentX = restingX; currentY = restingY; targetX = restingX; targetY = restingY;
    icon.style.transform = `rotateX(${restingX}deg) rotateY(${restingY}deg)`; shadow.style.transform = ''; sheen.style.background = '';
  });
}

// Keep native details semantics, with interruptible opening and closing animations.
for (const details of document.querySelectorAll('.quick-faq details')) {
  const summary = details.querySelector('summary');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let animation = null, expanded = details.open;
  const finish = () => {
    details.open = expanded;
    details.style.height = '';
    details.style.overflow = '';
    animation = null;
  };
  summary.addEventListener('click', event => {
    if (motion.matches || !details.animate) return;
    event.preventDefault();
    const start = details.getBoundingClientRect().height;
    expanded = !expanded;
    if (animation) { animation.onfinish = null; animation.cancel(); }
    details.style.height = '';
    details.open = true;
    const end = expanded ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height + 1;
    details.style.overflow = 'hidden';
    animation = details.animate([{ height: `${start}px` }, { height: `${end}px` }], {
      duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)'
    });
    animation.onfinish = finish;
  });
  details.addEventListener('toggle', () => { if (!animation) expanded = details.open; });
  motion.addEventListener('change', () => {
    if (motion.matches && animation) { animation.onfinish = null; animation.cancel(); finish(); }
  });
}
