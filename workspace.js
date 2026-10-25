(() => {
  const root = document.querySelector('#workspace');
  if (!root) return;
  const stage = root.querySelector('#workspace-stage');
  const overlay = root.querySelector('#workspace-overlay');
  const image = root.querySelector('#workspace-image');
  const background = root.querySelector('#background-window');
  const backgroundImage = root.querySelector('#background-image');
  const help = root.querySelector('#workspace-help');
  const message = root.querySelector('#workspace-message');
  const referenceFile = root.querySelector('#reference-file');
  const backgroundFile = root.querySelector('#background-file');
  const defaults = () => ({ src: 'images/screens/reference-content.webp', name: 'Design reference', width: 640, height: 444, baseSrc: 'images/screens/sample-build.webp', baseWidth: 640, baseHeight: 444, x: 0, y: 0, zoom: 1, inverted: true, blended: true });
  let state = defaults(), past = [], future = [], drag = null, frame = 0, placed = false, generation = 0;
  let stageWidth = 0, stageHeight = 0, baseWidth = 0, baseX = 0, baseY = 0;
  const urls = new Set();
  const say = text => { message.textContent = text; };
  const remember = () => { past.push({ ...state }); if (past.length > 30) past.shift(); future = []; };
  function clamp() {
    state.x = Math.max(40 - state.width * state.zoom, Math.min(stageWidth - 60, state.x));
    state.y = Math.max(0, Math.min(stageHeight - 38, state.y));
  }
  function paint() { frame = 0; overlay.style.transform = `translate3d(${state.x}px,${state.y}px,0)`; }
  function schedule() { if (!frame) frame = requestAnimationFrame(paint); }
  function render() {
    clamp();
    if (image.getAttribute('src') !== state.src) image.src = state.src;
    if (backgroundImage.getAttribute('src') !== state.baseSrc) backgroundImage.src = state.baseSrc;
    image.width = state.width; image.height = state.height;
    backgroundImage.width = state.baseWidth; backgroundImage.height = state.baseHeight;
    image.style.filter = state.inverted ? 'invert(1)' : 'none';
    image.style.opacity = state.blended ? '.5' : '1';
    overlay.style.width = `${state.width * state.zoom + 2}px`;
    root.querySelector('#overlay-name').textContent = state.name;
    root.querySelector('[data-action=invert]').setAttribute('aria-pressed', String(state.inverted));
    root.querySelector('[data-action=blend]').setAttribute('aria-pressed', String(state.blended));
    root.querySelector('.workspace-tip').textContent = state.inverted && state.blended
      ? 'Matching areas turn gray. Drag to compare the edges.'
      : 'Try Invert with 50% blend to make differences easier to see.';
    schedule();
  }
  function positionBackground() {
    const ratio = state.baseWidth / state.baseHeight;
    baseWidth = Math.min(state.baseWidth, Math.max(120, stageWidth - 72), Math.max(120, (stageHeight - 110) * ratio));
    baseX = (stageWidth - baseWidth) / 2; baseY = Math.max(20, (stageHeight - baseWidth / ratio - 34) / 2);
    background.style.width = `${baseWidth + 2}px`;
    background.style.transform = `translate3d(${baseX}px,${baseY}px,0)`;
  }
  function align() { state.zoom = baseWidth / state.width; state.x = baseX; state.y = baseY; }
  function layout() {
    stageWidth = stage.clientWidth; stageHeight = stage.clientHeight;
    positionBackground();
    if (!placed) { align(); state.x += 35; state.y += 20; placed = true; }
    render();
  }
  function fit() {
    state.zoom = Math.max(.1, Math.min(4, (stageWidth - 72) / state.width, (stageHeight - 110) / state.height));
    state.x = (stageWidth - state.width * state.zoom) / 2; state.y = Math.max(0, (stageHeight - state.height * state.zoom - 34) / 2);
  }
  async function importImage(file, baseline = false) {
    if (!file || !file.type.startsWith('image/')) return say('Choose an image, or paste an image from your design tool.');
    if (file.size > 30 * 1024 * 1024) return say('Please use an image smaller than 30 MB.');
    const revision = ++generation, url = URL.createObjectURL(file); urls.add(url);
    try {
      const probe = new Image(); probe.src = url; await probe.decode();
      if (revision !== generation) { urls.delete(url); URL.revokeObjectURL(url); return; }
      if (probe.naturalWidth * probe.naturalHeight > 40_000_000) throw new Error('Please use a smaller image.');
      remember();
      if (baseline) Object.assign(state, { baseSrc: url, baseWidth: probe.naturalWidth, baseHeight: probe.naturalHeight });
      else Object.assign(state, { src: url, name: file.name || 'Your reference', width: probe.naturalWidth, height: probe.naturalHeight });
      positionBackground(); if (!baseline) fit(); render();
      root.querySelector('.demo-import').open = false;
      say(baseline ? 'Background replaced. Drag Trace into place.' : 'Reference replaced. Drag it into place.');
      root.focus({ preventScroll: true });
    } catch { urls.delete(url); URL.revokeObjectURL(url); say('That image could not be opened. Try a smaller PNG, JPEG, or WebP.'); }
  }
  function action(name) {
    if (name === 'reference') return referenceFile.click();
    if (name === 'baseline') return backgroundFile.click();
    if (name === 'shortcuts') return help.showModal();
    if (name === 'close-help') return help.close();
    if (name === 'reset') {
      generation++; state = defaults(); past = []; future = []; placed = false; layout();
      for (const url of urls) URL.revokeObjectURL(url); urls.clear();
      say('Back to the sample. Drag the front window to explore.'); return;
    }
    if (name === 'undo' || name === 'redo') {
      const from = name === 'undo' ? past : future, to = name === 'undo' ? future : past;
      if (from.length) { to.push({ ...state }); state = from.pop(); positionBackground(); render(); say(name === 'undo' ? 'Change undone.' : 'Change restored.'); } return;
    }
    remember();
    if (name === 'invert') state.inverted = !state.inverted;
    if (name === 'blend') state.blended = !state.blended;
    if (name === 'align') { align(); say('Aligned. Matching areas turn gray with Invert and 50% blend.'); }
    if (name === 'in') state.zoom = Math.min(4, state.zoom + .1);
    if (name === 'out') state.zoom = Math.max(.1, state.zoom - .1);
    if (name === 'actual') state.zoom = 1;
    if (name === 'fit') fit();
    render();
  }
  root.addEventListener('click', event => { const trigger = event.target.closest('[data-action]'); if (trigger) action(trigger.dataset.action); });
  referenceFile.addEventListener('change', () => { void importImage(referenceFile.files[0]); referenceFile.value = ''; });
  backgroundFile.addEventListener('change', () => { void importImage(backgroundFile.files[0], true); backgroundFile.value = ''; });
  root.addEventListener('paste', event => { const item = [...event.clipboardData.items].find(i => i.type.startsWith('image/')); if (item) { event.preventDefault(); void importImage(item.getAsFile()); } });
  stage.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; });
  stage.addEventListener('drop', event => { event.preventDefault(); void importImage(event.dataTransfer.files[0]); });
  overlay.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    remember(); drag = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: state.x, originY: state.y };
    overlay.setPointerCapture(event.pointerId); overlay.focus({ preventScroll: true }); overlay.classList.add('dragging'); event.preventDefault();
  });
  overlay.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    state.x = drag.originX + event.clientX - drag.x; state.y = drag.originY + event.clientY - drag.y; clamp(); schedule();
  });
  const end = event => { if (drag && event.pointerId === drag.id) { drag = null; overlay.classList.remove('dragging'); } };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) overlay.addEventListener(type, end);
  root.addEventListener('keydown', event => {
    if (help.open || event.target.closest('input,textarea,[contenteditable=true],.demo-import')) return;
    const mod = event.metaKey || event.ctrlKey, key = event.key.toLowerCase();
    if (mod && !event.altKey) {
      const name = { i:'invert', l:'blend', z:event.shiftKey ? 'redo':'undo', f:'fit', '0':'actual', '+':'in', '=':'in', '-':'out' }[key];
      if (name) { event.preventDefault(); action(name); return; }
    }
    if (!mod && !event.altKey && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
      event.preventDefault(); if (!event.repeat) remember(); const step = event.shiftKey ? 10 : 1;
      state.x += event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
      state.y += event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;
      clamp(); schedule();
    }
  });
  stage.addEventListener('pointerdown', event => { if (!event.target.closest('.workspace-overlay')) root.focus({ preventScroll: true }); });
  window.addEventListener('pagehide', () => { for (const url of urls) URL.revokeObjectURL(url); });
  new ResizeObserver(layout).observe(stage); layout();
})();
