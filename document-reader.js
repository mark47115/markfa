(() => {
  const reader = document.getElementById('portfolio-reader');
  const host = reader.querySelector('.reader-frame');
  const status = reader.querySelector('[role="status"]');
  const save = reader.querySelector('[download]');
  const pdfLink = document.getElementById('reader-pdf');
  const specs = JSON.parse(document.getElementById('document-index').textContent);
  let active, frame, returnHash = '#portfolio';
  let urls = [];

  function route(hash) {
    const match = /^#document\/([a-z-]+)(?:\/([\w=%.-]+))?$/.exec(hash);
    if (!match) return null;
    const key = match[1] === 'journal-check' ? 'journal' : match[1];
    return Object.hasOwn(specs, key) && specs[key].filename ? {key, check:match[1] === 'journal-check', fragment:decodeURIComponent(match[2] || '')} : null;
  }

  function release() {
    active?.abort();
    active = null;
    frame?.remove();
    frame = null;
    save.hidden = true;
    save.removeAttribute('href');
    pdfLink.hidden = true;
    pdfLink.removeAttribute('href');
    urls.forEach(url => URL.revokeObjectURL(url));
    urls = [];
  }
  function objectUrl(blob) {
    const url = URL.createObjectURL(blob);
    urls.push(url);
    return url;
  }
  async function unpack(key, signal) {
    const parts = specs[key].parts;
    let next = 0;
    const source = new ReadableStream({
      async pull(controller) {
        signal.throwIfAborted();
        if (next === parts.length) return controller.close();
        const response = await fetch(parts[next++], {signal});
        if (!response.ok) throw new Error('Failed to load document part: ' + response.status);
        controller.enqueue(new Uint8Array(await response.arrayBuffer()));
      }
    });
    const result = await new Response(source.pipeThrough(new DecompressionStream('gzip'))).blob();
    if (result.size !== specs[key].size) throw new Error('incomplete document');
    return result.slice(0, result.size, specs[key].type);
  }
  async function journalFont() {
    const response = await fetch('assets/fonts/NotoSansKR-VF.ttf');
    const font = await response.blob();
    return new Promise((resolve, reject) => {
      const data = new FileReader();
      data.onload = () => resolve(data.result);
      data.onerror = () => reject(data.error);
      data.readAsDataURL(font);
    });
  }
  async function forReader(raw, spec, target) {
    if (!spec.patches.length) return raw;
    const pieces = [];
    let cursor = 0;
    for (const [start, end, replacement] of spec.patches) {
      let value = replacement;
      if (value === '$CHECK') value = String(target.check);
      if (value === '$FONT') value = '<style>@font-face{font-family:"Noto Sans KR";src:url("' +
        await journalFont() + '") format("truetype");font-weight:100 900;font-display:swap}</style>';
      pieces.push(raw.slice(cursor, start), value);
      cursor = end;
    }
    pieces.push(raw.slice(cursor));
    return new Blob(pieces, {type:spec.type});
  }
  async function show(target) {
    release();
    const controller = new AbortController();
    active = controller;
    const spec = specs[target.key];
    document.getElementById('reader-title').textContent = spec.title;
    status.hidden = false;
    status.textContent = '문서를 여는 중입니다…';
    if (!reader.open) reader.showModal();
    try {
      const raw = await unpack(target.key, controller.signal);
      controller.signal.throwIfAborted();
      const documentBlob = target.key === 'raid'
        ? await unpack('raid-pages', controller.signal) : await forReader(raw, spec, target);
      controller.signal.throwIfAborted();
      save.href = objectUrl(raw);
      save.download = spec.filename;
      save.hidden = false;
      if (target.key === 'raid') {
        pdfLink.href = save.href + (target.fragment ? '#' + target.fragment : '');
        pdfLink.hidden = false;
      }
      frame = document.createElement('iframe');
      frame.title = spec.title;
      frame.addEventListener('load', () => { if (controller === active) status.hidden = true; }, {once:true});
      const url = documentBlob === raw ? save.href : objectUrl(documentBlob);
      frame.src = url + (target.fragment ? '#' + target.fragment : '');
      host.append(frame);
    } catch (error) {
      if (!controller.signal.aborted) {
        status.textContent = '문서를 열 수 없습니다. 최신 Chrome 또는 Edge에서 이 HTML 파일을 다시 열어 주세요.';
        console.error(error);
      }
    }
  }
  function closeReader() {
    release();
    if (reader.open) reader.close();
  }
  function returnToPage(hash = returnHash) {
    closeReader();
    history.replaceState(null, '', location.pathname + location.search + hash);
  }
  reader.querySelector('button').addEventListener('click', () => returnToPage());
  reader.addEventListener('cancel', event => { event.preventDefault(); returnToPage(); });
  window.addEventListener('keydown', event => {
    if (reader.open && event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      returnToPage();
    }
  }, true);
  document.addEventListener('click', event => {
    const anchor = event.target.closest?.('a[href]');
    const target = anchor && route(anchor.hash);
    if (!target || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    returnHash = route(location.hash) ? '#portfolio' : location.hash;
    history.pushState(null, '', anchor.hash);
    show(target);
  }, true);
  window.addEventListener('hashchange', () => {
    const target = route(location.hash);
    if (target) show(target);
    else if (reader.open) closeReader();
  });
  window.addEventListener('message', event => {
    if (frame && event.source === frame.contentWindow && event.data === 'portfolio-return-ai') {
      returnToPage('#ai');
      document.getElementById('ai').scrollIntoView();
    }
  });
  const initial = route(location.hash);
  if (initial) show(initial);
})();
