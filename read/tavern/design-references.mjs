import { mountBattleMaps } from './battle-maps.mjs';
import { mountCombatVfx } from './combat-vfx.mjs';

function audioControls(root, signal) {
  const tracks = new Map();
  for (const player of root.querySelectorAll('audio[src]')) {
    const path = player.getAttribute('src');
    player.removeAttribute('src');
    player.hidden = true;
    const play = document.createElement('button');
    play.type = 'button';
    play.dataset.designAudio = '';
    play.textContent = '듣기';
    player.before(play);
    const track = { path, play };
    tracks.set(player, track);
    player.addEventListener('play', () => {
      for (const other of tracks.keys()) if (other !== player) other.pause();
    });
    play.addEventListener('click', async () => {
      const selected = track.path;
      play.disabled = true;
      play.textContent = '불러오는 중';
      try {
        const response = await fetch(selected, { signal });
        if (!response.ok) throw new Error('오디오를 불러오지 못했습니다.');
        const bytes = await response.blob();
        if (signal.aborted || track.path !== selected) return;
        track.url = URL.createObjectURL(bytes);
        player.src = track.url;
        player.hidden = false;
        play.hidden = true;
        await player.play().catch(() => {});
      } catch {
        if (!signal.aborted && track.path === selected) play.textContent = '다시 듣기';
      } finally {
        play.disabled = false;
      }
    });
  }
  function release(player, track) {
    player.pause();
    player.removeAttribute('src');
    if (track.url) URL.revokeObjectURL(track.url);
    track.url = null;
  }
  signal.addEventListener('abort', () => {
    for (const [player, track] of tracks) release(player, track);
  }, { once: true });
  return (player, path) => {
    const track = tracks.get(player);
    if (!track || track.path === path) return;
    release(player, track);
    track.path = path;
    player.hidden = true;
    track.play.hidden = false;
    track.play.textContent = '듣기';
  };
}

export function prefixIds(root, prefix) {
  const ids = new Map();
  for (const element of root.querySelectorAll('[id]')) {
    ids.set(element.id, prefix + '-' + element.id);
    element.id = ids.get(element.id);
  }
  for (const element of root.querySelectorAll('[for], [aria-labelledby], [aria-describedby], [aria-controls], a[href^="#"]')) {
    for (const name of ['for', 'aria-labelledby', 'aria-describedby', 'aria-controls']) {
      const value = element.getAttribute(name);
      if (value) element.setAttribute(name, value.split(/\s+/).map(id => ids.get(id) ?? id).join(' '));
    }
    const fragment = element.getAttribute('href')?.slice(1);
    if (ids.has(fragment)) element.setAttribute('href', '#' + ids.get(fragment));
  }
}

function startTool(body, start, signal, inline) {
  if (!inline || !('IntersectionObserver' in window)) return start();
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    if (!signal.aborted) start();
  }, { rootMargin: '100% 0px' });
  observer.observe(body);
  signal.addEventListener('abort', () => observer.disconnect(), { once: true });
}

function fill(host, id, signal, { inline = false, namespace } = {}) {
  const reference = host.dataset.reference;
  const markup = window.TavernDesignReferences[reference];
  const body = document.createElement('div');
  body.className = 'embedded-source';
  body.innerHTML = markup;
  compactPresentation(body, reference, inline);
  window.prepareMakReadingTables(body);
  for (const image of body.querySelectorAll('img')) image.loading = 'lazy';
  host.append(body);
  if (reference === 'battle-maps.html') {
    startTool(body, () => void mountBattleMaps(body, { signal, initialRound: id }), signal, inline);
  }
  if (reference === 'combat-vfx.html') startTool(body, () => void mountCombatVfx(body, { signal }), signal, inline);
  if (reference === 'ally-animation.html') startTool(body, () => {
    window.mountTavernUnitMotion(body, { signal, unitId: host.dataset.unitId, viewportOnly: inline });
    if (namespace) prefixIds(body, namespace);
  }, signal, inline);
  if (reference === 'game-data.html') {
    const switchInPlace = host.hasAttribute('data-inline-table');
    body.querySelector('.table-selector').hidden = !switchInPlace;
    window.mountTavernGameData(body, { signal, tab: id ?? 'effects', inline: switchInPlace });
    const chart = window.TavernDesignVisuals['game-data/' + id];
    if (chart) {
      const preview = document.createElement('div');
      preview.className = 'data-visual';
      summaryImages(preview, chart);
      body.prepend(preview);
    }
  }
  if (inline && (reference === 'game-data.html' || reference === 'tavern-levels')) {
    prefixIds(body, host.closest('[data-document-page]').dataset.documentPage);
  }
  if (body.querySelector('audio')) {
    const setTrack = audioControls(body, signal);
    if (reference === 'battle-audio.html') window.mountTavernBattleAudio(body, { signal, setTrack });
  }
  return body;
}

function disclose(title) {
  const detail = document.createElement('details');
  detail.className = 'reading-notes';
  const summary = document.createElement('summary');
  summary.textContent = title;
  detail.append(summary);
  return detail;
}

function compactPresentation(body, reference, inline) {
  if (reference === 'tutorial-reference.html') {
    const intro = body.querySelector('.embedded-intro p');
    if (intro) intro.textContent = '고용 → 배치 → 출정 → 결과';
  }
  if (inline) return;
  if (reference === 'card-readability.html') {
    const sections = [...body.querySelectorAll('section[aria-labelledby]:is([aria-labelledby="principles-title"], [aria-labelledby="process-title"], [aria-labelledby="tavern-title"])')];
    if (sections.length) {
      const notes = disclose('해설과 제작 자료');
      sections[0].before(notes);
      notes.append(...sections);
    }
  }
  if (reference === 'art-direction.html') {
    for (const section of body.querySelectorAll('.container > section')) {
      const prose = [...section.querySelectorAll(':scope > :is(p,ul,ol)')];
      if (!prose.length) continue;
      const notes = disclose(section.querySelector('h2')?.textContent ?? '제작 기준');
      const hasImage = section.querySelector('figure');
      if (hasImage) section.append(notes);
      else {
        section.after(notes);
        section.remove();
      }
      notes.append(...prose);
    }
  }
}

function summaryImages(host, images) {
  const gallery = document.createElement('div');
  gallery.className = 'visual-summary';
  for (const item of images) {
    const figure = document.createElement('figure');
    const image = new Image();
    image.alt = item.alt;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.src = item.src;
    figure.append(image);
    if (item.caption) {
      const caption = document.createElement('figcaption');
      caption.textContent = item.caption;
      figure.append(caption);
    }
    gallery.append(figure);
  }
  host.append(gallery);
}

function bindDetail(host, signal, render) {
  let child;
  let body;
  host.addEventListener('toggle', () => {
    if (host.open && !child) {
      child = new AbortController();
      body = render(child.signal);
    } else if (!host.open && child) {
      child.abort();
      body.remove();
      child = body = null;
    }
  }, { signal });
  signal.addEventListener('abort', () => child?.abort(), { once: true });
}

export function mountReferences(root, id, signal, options = {}) {
  for (const host of root.querySelectorAll('[data-reference]')) {
    const reference = host.dataset.reference;
    const visuals = window.TavernDesignVisuals[reference];
    if (options.inline) {
      if (host.tagName === 'DETAILS') {
        bindDetail(host, signal, child => fill(host, id, child, options));
      } else if (reference.endsWith('.md')) {
        const count = Number(host.dataset.summaryVisuals ?? 1);
        if (visuals?.length && count) summaryImages(host, visuals.slice(0, count));
        const detail = disclose(host.dataset.noteLabel ?? '세부 규칙과 자료');
        detail.dataset.reference = reference;
        host.append(detail);
        bindDetail(detail, signal, child => {
          const body = fill(detail, id, child, options);
          if (visuals?.length > count) summaryImages(body, visuals.slice(count));
          return body;
        });
      } else {
        if (visuals) summaryImages(host, visuals);
        fill(host, id, signal, options);
      }
      continue;
    }
    if (host.tagName !== 'DETAILS') {
      if (visuals) summaryImages(host, visuals);
      if (visuals && reference.endsWith('.md')) {
        const detail = disclose(host.dataset.noteLabel ?? '세부 자료');
        detail.dataset.reference = reference;
        host.append(detail);
        bindDetail(detail, signal, child => fill(detail, id, child, options));
      } else {
        fill(host, id, signal, options);
      }
      continue;
    }
    bindDetail(host, signal, child => {
      const body = fill(host, id, child, options);
      if (visuals) summaryImages(body, visuals);
      return body;
    });
  }
}
