(() => {
  const root = document.querySelector('#workspace');
  if (!root) return;
  const stage = root.querySelector('#workspace-stage');
  const overlay = root.querySelector('#workspace-overlay');
  const image = root.querySelector('#workspace-image');
  const background = root.querySelector('#background-window');
  const backgroundImage = root.querySelector('#background-image');
  const tabsView = root.querySelector('#workspace-tabs');
  const thumbnails = root.querySelector('#workspace-thumbnails');
  const help = root.querySelector('#workspace-help');
  const message = root.querySelector('#workspace-message');
  const referenceFile = root.querySelector('#reference-file');
  const backgroundFile = root.querySelector('#background-file');
  let nextId = 1, activeId = 1, drag = null, frame = 0, captureBusy = false;
  let stageWidth = 0, stageHeight = 0, backgroundWidth = 640, baselineX = 0, baselineY = 0;
  const objectUrls = new Set();
  const makeTab = (name, src = '', width = 640, height = 444) => ({ id: nextId++, name, src, width, height, x: 70, y: 110, zoom: 1, inverted: true, blended: true, locked: false, hidden: false, opacity: 1, past: [], future: [] });
  const tabs = [makeTab('Northstar reference', 'images/screens/reference-content.webp')];
  const active = () => tabs.find(t => t.id === activeId);
  const snapshot = t => ({ name: t.name, src: t.src, width: t.width, height: t.height, x: t.x, y: t.y, zoom: t.zoom, inverted: t.inverted, blended: t.blended, locked: t.locked, hidden: t.hidden, opacity: t.opacity });
  const remember = t => { t.past.push(snapshot(t)); if (t.past.length > 30) t.past.shift(); t.future = []; };
  const say = text => { message.textContent = text; };
  function clamp(t) {
    t.x = Math.max(40 - t.width * t.zoom, Math.min(stageWidth - 60, t.x));
    t.y = Math.max(0, Math.min(stageHeight - 38, t.y));
  }
  function paint() { frame = 0; const t = active(); overlay.style.transform = `translate3d(${t.x}px,${t.y}px,0)`; }
  function schedule() { if (!frame) frame = requestAnimationFrame(paint); }
  function button(action) { return root.querySelector(`[data-action="${action}"]`); }
  function render() {
    const t = active(); clamp(t);
    if (image.getAttribute('src') !== t.src) image.src = t.src || 'images/icon.webp';
    image.alt = t.name;
    image.style.filter = t.inverted ? 'invert(1)' : 'none';
    image.style.opacity = t.blended ? '.5' : '1';
    overlay.style.width = `${t.width * t.zoom + 2}px`;
    overlay.hidden = !t.src || t.hidden;
    overlay.classList.toggle('locked', t.locked);
    overlay.style.opacity = String(t.opacity);
    root.querySelector('#window-opacity').value = String(Math.round(t.opacity * 100));
    overlay.tabIndex = t.locked ? -1 : 0;
    root.querySelector('#overlay-name').textContent = t.name;
    root.querySelector('#workspace-empty').hidden = !!t.src;
    for (const [action, pressed] of [['invert', t.inverted], ['blend', t.blended], ['lock', t.locked]]) button(action).setAttribute('aria-pressed', String(pressed));
    button('undo').disabled = !t.past.length; button('redo').disabled = !t.future.length;
    root.querySelector('#zoom-label').textContent = `${Math.round(t.zoom * 100)}%`;
    schedule();
    renderTabs();
  }
  function renderTabs() {
    tabsView.replaceChildren(); thumbnails.replaceChildren();
    for (const t of tabs) {
      const tab = document.createElement('button'); tab.type = 'button'; tab.role = 'tab'; tab.id = `reference-tab-${t.id}`;
      tab.textContent = t.name; tab.setAttribute('aria-selected', String(t.id === activeId)); tab.tabIndex = t.id === activeId ? 0 : -1;
      tab.addEventListener('click', () => select(t.id));
      tab.addEventListener('keydown', e => { if (['ArrowLeft','ArrowRight'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); const index = tabs.indexOf(t); select(tabs[(index + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].id); tabsView.querySelector('[aria-selected=true]').focus(); } });
      const group = document.createElement('div'); group.className = 'workspace-tab'; group.append(tab);
      const close = document.createElement('button'); close.type = 'button'; close.setAttribute('aria-label', `Close ${t.name}`);
      close.innerHTML = '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="m7 7 10 10M7 17 17 7"/></svg>';
      close.addEventListener('click', () => { activeId = t.id; action('close'); }); group.append(close); tabsView.append(group);
      const thumb = document.createElement('button'); thumb.type = 'button'; thumb.setAttribute('aria-current', String(t.id === activeId));
      if (t.src) { const img = document.createElement('img'); img.src = t.src; img.alt = ''; thumb.append(img); }
      const label = document.createElement('span'); label.textContent = t.name; thumb.append(label); thumb.addEventListener('click', () => select(t.id)); thumbnails.append(thumb);
    }
    const add = document.createElement('button'); add.textContent = '+'; add.setAttribute('aria-label', 'New reference tab'); add.addEventListener('click', () => action('new')); tabsView.append(add);
  }
  function select(id) { activeId = id; render(); say(`Selected ${active().name}.`); }
  function layout() {
    stageWidth = stage.clientWidth; stageHeight = stage.clientHeight;
    const ratio = (backgroundImage.naturalWidth || backgroundImage.width) / (backgroundImage.naturalHeight || backgroundImage.height);
    backgroundWidth = Math.min(backgroundImage.width === 1280 ? 640 : backgroundImage.width, Math.max(120, stageWidth - 80), Math.max(120, (stageHeight - 100) * ratio));
    baselineX = (stageWidth - backgroundWidth) / 2; baselineY = Math.max(24, (stageHeight - backgroundWidth / ratio - 34) / 2);
    background.style.width = `${backgroundWidth + 2}px`; background.style.transform = `translate3d(${baselineX}px,${baselineY}px,0)`;
    render();
  }
  function fit(t) { t.zoom = Math.max(.1, Math.min(4, (stageWidth - 80) / t.width, (stageHeight - 110) / t.height)); t.x = (stageWidth - t.width * t.zoom) / 2; t.y = Math.max(0, (stageHeight - t.height * t.zoom - 34) / 2); }
  async function importImage(file, baseline = false) {
    if (!file || !file.type.startsWith('image/')) { say('Choose an image file or paste an image from your design tool.'); return; }
    if (file.size > 30 * 1024 * 1024) { say('Please use an image smaller than 30 MB.'); return; }
    const url = URL.createObjectURL(file); objectUrls.add(url);
    try {
      const probe = new Image(); probe.src = url; await probe.decode();
      if (probe.naturalWidth * probe.naturalHeight > 40_000_000) throw new Error('This image is too large. Use a smaller image.');
      if (baseline) {
        backgroundImage.src = url; backgroundImage.width = probe.naturalWidth; backgroundImage.height = probe.naturalHeight;
        // Size the background to fit the canvas without changing the reference.
        backgroundWidth = Math.min(probe.naturalWidth, stageWidth - 60, (stageHeight - 90) * probe.naturalWidth / probe.naturalHeight);
        baselineX = (stageWidth - backgroundWidth) / 2; baselineY = Math.max(20, (stageHeight - backgroundWidth * probe.naturalHeight / probe.naturalWidth - 34) / 2);
        background.style.width = `${backgroundWidth + 2}px`; background.style.transform = `translate3d(${baselineX}px,${baselineY}px,0)`;
        say('Background updated. Align your reference to compare.');
      } else {
        let t = active();
        if (t.src) { t = makeTab(file.name || 'Pasted reference'); tabs.push(t); activeId = t.id; }
        else remember(t);
        Object.assign(t, { src: url, name: file.name || 'Pasted reference', width: probe.naturalWidth, height: probe.naturalHeight }); fit(t); render();
        say('Reference added. Drag to align, or use the arrow keys.');
      }
    } catch (error) { objectUrls.delete(url); URL.revokeObjectURL(url); say(error.message || 'That image could not be opened.'); }
  }
  async function copyImage() {
    const t = active(); if (!t.src) return say('Add an image first.');
    try {
      const probe = new Image(); probe.src = t.src; await probe.decode();
      const canvas = document.createElement('canvas'); canvas.width = probe.naturalWidth; canvas.height = probe.naturalHeight; canvas.getContext('2d').drawImage(probe, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); say('Original reference copied to the clipboard.');
    } catch { say('Your browser could not copy the image. Use the Mac app for a native clipboard workflow.'); }
  }
  async function capture() {
    if (captureBusy) return;
    if (!navigator.mediaDevices?.getDisplayMedia) return say('Screen capture is unavailable in this browser. Add a screenshot instead.');
    captureBusy = true; let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const video = document.createElement('video'); video.srcObject = stream; video.muted = true; await video.play();
      await new Promise(resolve => { if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(resolve); else requestAnimationFrame(resolve); });
      const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight; canvas.getContext('2d').drawImage(video, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      stream.getTracks().forEach(track => track.stop()); stream = null; video.srcObject = null;
      await importImage(new File([blob], 'Screen capture.png', { type: 'image/png' }));
    } catch { say('Screen capture cancelled or unavailable. You can paste or upload a screenshot instead.'); }
    finally { stream?.getTracks().forEach(track => track.stop()); captureBusy = false; }
  }
  function action(name) {
    const t = active();
    if (name === 'reference') return referenceFile.click();
    if (name === 'baseline') return backgroundFile.click();
    if (name === 'capture') return void capture();
    if (name === 'copy') return void copyImage();
    if (name === 'shortcuts') return help.showModal();
    if (name === 'close-help') return help.close();
    if (name === 'sidebar') { const sidebar = root.querySelector('#workspace-sidebar'); sidebar.hidden = !sidebar.hidden; return; }
    if (name === 'tabbar') { tabsView.hidden = !tabsView.hidden; return; }
    if (name === 'theme') { root.classList.toggle('dark'); return; }
    if (name === 'new') { const next = makeTab(`Reference ${nextId}`); tabs.push(next); activeId = next.id; render(); say('New tab. Paste or add a reference image.'); return; }
    if (name === 'close') { if (tabs.length === 1) { const next = makeTab('New reference'); tabs.splice(0, 1, next); activeId = next.id; } else { const index = tabs.indexOf(t); tabs.splice(index, 1); activeId = tabs[Math.min(index, tabs.length - 1)].id; } render(); say('Reference closed.'); return; }
    if (name === 'undo' || name === 'redo') {
      const from = name === 'undo' ? t.past : t.future, to = name === 'undo' ? t.future : t.past;
      if (from.length) { to.push(snapshot(t)); Object.assign(t, from.pop()); render(); say(name === 'undo' ? 'Change undone.' : 'Change restored.'); } return;
    }
    remember(t);
    if (name === 'invert') t.inverted = !t.inverted;
    if (name === 'blend') t.blended = !t.blended;
    if (name === 'lock') { t.locked = !t.locked; say(t.locked ? 'Overlay locked. Use Lock again to move it.' : 'Overlay unlocked.'); }
    if (name === 'hide') t.hidden = !t.hidden;
    if (name === 'show') t.hidden = false;
    if (name === 'in') t.zoom = Math.min(4, t.zoom + .1);
    if (name === 'out') t.zoom = Math.max(.1, t.zoom - .1);
    if (name === 'actual') t.zoom = 1;
    if (name === 'fit') fit(t);
    if (name === 'align') { t.zoom = backgroundWidth / t.width; t.x = baselineX; t.y = baselineY; say('Image edges aligned. Different aspect ratios still need manual adjustment.'); }
    render();
  }
  root.addEventListener('click', event => { const trigger = event.target.closest('[data-action]'); if (trigger) action(trigger.dataset.action); });
  const opacityInput = root.querySelector('#window-opacity');
  opacityInput.addEventListener('pointerdown', () => remember(active()));
  opacityInput.addEventListener('keydown', event => { if (!event.repeat && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) remember(active()); });
  opacityInput.addEventListener('input', () => { active().opacity = Number(opacityInput.value) / 100; overlay.style.opacity = String(active().opacity); button('undo').disabled = false; button('redo').disabled = true; });
  referenceFile.addEventListener('change', async () => { for (const file of referenceFile.files) await importImage(file); referenceFile.value = ''; });
  backgroundFile.addEventListener('change', async () => { await importImage(backgroundFile.files[0], true); backgroundFile.value = ''; });
  root.addEventListener('paste', async event => { const files = [...event.clipboardData.items].filter(i => i.type.startsWith('image/')).map(i => i.getAsFile()); if (files.length) { event.preventDefault(); for (const file of files) await importImage(file); } else say('Copy an image from your design tool, then paste it here.'); });
  stage.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; });
  stage.addEventListener('drop', async event => { event.preventDefault(); for (const file of event.dataTransfer.files) await importImage(file); });
  overlay.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button') || active().locked) return;
    const t = active(); remember(t); drag = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: t.x, originY: t.y };
    overlay.setPointerCapture(event.pointerId); overlay.focus({ preventScroll: true }); overlay.classList.add('dragging'); event.preventDefault();
  });
  overlay.addEventListener('pointermove', event => { if (!drag || event.pointerId !== drag.id) return; const t = active(); t.x = drag.originX + event.clientX - drag.x; t.y = drag.originY + event.clientY - drag.y; clamp(t); schedule(); });
  const end = event => { if (drag && event.pointerId === drag.id) { drag = null; overlay.classList.remove('dragging'); render(); } };
  for (const type of ['pointerup','pointercancel','lostpointercapture']) overlay.addEventListener(type, end);
  root.addEventListener('keydown', event => {
    if (help.open || event.target.closest('input,textarea,[contenteditable=true]')) return;
    const mod = event.metaKey || event.ctrlKey, key = event.key.toLowerCase();
    let name;
    if (mod && event.ctrlKey && (event.metaKey || !/Mac/.test(navigator.platform))) { if (key === 'l') name = 'lock'; if (key === 'h') name = 'hide'; }
    if (!name && mod) {
      const map = { g:'capture', i:'invert', l:'blend', c:'copy', z:event.shiftKey ? 'redo':'undo', t:event.shiftKey ? 'tabbar':'new', w:'close', f:'fit', '0':'actual', '+':'in', '=':'in', '-':'out', '\\':'sidebar', d:'theme', n:'new' };
      name = map[key];
      if (/^[1-9]$/.test(key) && tabs[Number(key)-1]) { event.preventDefault(); select(tabs[Number(key)-1].id); return; }
    }
    if (name) { event.preventDefault(); action(name); return; }
    if (!mod && !event.altKey && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
      if (active().locked) return;
      event.preventDefault(); const t = active(); if (!event.repeat) remember(t);
      const step = event.shiftKey ? 10 : 1;
      t.x += event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
      t.y += event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;
      clamp(t); render();
    }
  });
  stage.addEventListener('pointerdown', event => { if (!event.target.closest('.workspace-overlay')) root.focus({ preventScroll: true }); });
  window.addEventListener('pagehide', () => { for (const url of objectUrls) URL.revokeObjectURL(url); });
  new ResizeObserver(layout).observe(stage);
  layout(); fit(active()); active().x += 35; active().y += 20; render(); root.focus({ preventScroll: true });
})();
