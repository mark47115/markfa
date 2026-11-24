(() => {
  const menu = document.querySelector('.contents-menu');
  const compactMenu = window.matchMedia('(max-width: 820px)');
  const menuToggle = menu.querySelector('summary');
  function setMenuLayout() {
    menu.open = !compactMenu.matches;
  }
  setMenuLayout();
  compactMenu.addEventListener('change', setMenuLayout);
  menu.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link && compactMenu.matches) {
      menu.open = false;
      const target = document.getElementById(link.hash.slice(1));
      target.tabIndex = -1;
      target.focus({preventScroll: true});
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && compactMenu.matches && menu.open) {
      menu.open = false;
      menuToggle.focus();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (compactMenu.matches && menu.open && !menu.contains(event.target)) menu.open = false;
  });

  const drawer = document.querySelector('#brief-drawer');
  const drawerBody = drawer.querySelector('.brief-body');
  let opener;
  if (typeof drawer.showModal === 'function') {
    document.querySelectorAll('button[data-brief]').forEach(button => {
      button.hidden = false;
      button.addEventListener('click', () => {
        const template = document.getElementById('brief-' + button.dataset.brief);
        opener = button;
        drawer.dataset.book = button.dataset.brief;
        drawerBody.replaceChildren(template.content.cloneNode(true));
        drawer.showModal();
        drawerBody.scrollTop = 0;
      });
    });
  }
  function onBackdrop(event) {
    if (event.target !== drawer) return false;
    const rect = drawer.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX >= rect.right ||
      event.clientY < rect.top || event.clientY >= rect.bottom;
  }
  let pressedBackdrop = false;
  drawer.addEventListener('pointerdown', event => { pressedBackdrop = onBackdrop(event); });
  drawer.addEventListener('click', event => {
    if (pressedBackdrop && onBackdrop(event)) drawer.close();
    pressedBackdrop = false;
  });
  drawer.addEventListener('close', () => {
    pressedBackdrop = false;
    opener?.focus({preventScroll: true});
  });

  const shelf = document.querySelector('.book-shelf');
  const exhibition = shelf.closest('#portfolio');
  const galleryHeading = exhibition.querySelector('.page-title');
  const covers = shelf.querySelector('.book-covers');
  const sheet = shelf.querySelector('.book-sheet');
  const sheetClose = sheet.querySelector('.sheet-close');
  const sheetLink = sheet.querySelector('.sheet-original');
  const sheetPhoto = sheet.querySelector('.book-artwork img');
  const introduction = sheet.querySelector('.sheet-content');
  const sheetMedia = sheet.querySelector('.sheet-media');
  const preview = sheet.querySelector('[data-brief]');
  const canSlide = typeof sheet.animate === 'function';
  let activeBook = null;
  let closeOnMouseExit = false;
  let unfolding;
  let closing = false;
  const slideDuration = 600;
  const slideEase = 'cubic-bezier(.38,0,.18,1)';

  // Plain links open each original document when scripting is unavailable.
  const books = [...covers.querySelectorAll('.book-cover')].map(link => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = link.className;
    if (link.id) button.id = link.id;
    button.setAttribute('aria-controls', sheet.id);
    button.setAttribute('aria-expanded', 'false');
    button.append(...link.childNodes);
    link.replaceWith(button);
    const key = link.dataset.book;
    return {
      button, key, url: link.href, linkLabel: link.dataset.linkLabel, summary: link.dataset.summary,
      category: button.closest('.book-group').querySelector('h3').textContent,
      title: button.querySelector('.book-title'), kind: button.querySelector('.book-game').textContent,
      image: button.querySelector(':scope > img').src, question: document.getElementById('brief-' + key).content.querySelector('h3').textContent
    };
  });
  function slideFromCover(book) {
    const frame = exhibition.getBoundingClientRect();
    const cover = book.button.getBoundingClientRect();
    // Offset the reveal window by the slide distance so it still starts on the exact cover.
    const dx = (cover.left + cover.width / 2 - frame.left - frame.width / 2) * .82;
    const dy = (cover.top + cover.height / 2 - frame.top - frame.height / 2) * .36;
    const edges = [cover.top-frame.top-dy, frame.right-cover.right+dx,
      frame.bottom-cover.bottom+dy, cover.left-frame.left-dx];
    return sheet.animate([
      {transform:'translate3d('+dx+'px,'+dy+'px,0)',clipPath:'inset('+edges.map(edge => edge + 'px').join(' ')+')',opacity:0},
      {offset:.15,opacity:1},
      {transform:'translate3d(0,0,0)',clipPath:'inset(0px 0px 0px 0px)',opacity:1}
    ], {duration:slideDuration,easing:slideEase,fill:'both'});
  }
  function swapArtwork(book, direction) {
    const oldLayer = sheetPhoto.parentElement.querySelector('.departing-art');
    oldLayer?.remove();
    sheetPhoto.getAnimations?.().forEach(animation => animation.cancel());
    if (direction && canSlide) {
      const previous = sheetPhoto.cloneNode(false);
      previous.className = 'departing-art';
      previous.style.objectPosition = getComputedStyle(sheetPhoto).objectPosition;
      sheetPhoto.before(previous);
      const timing = {duration:440,easing:slideEase};
      const leaving = previous.animate([{transform:'none'},{transform:'translateX('+(-direction*42)+'%)'}],timing);
      leaving.onfinish = () => previous.remove();
      sheetPhoto.animate([{transform:'translateX('+(direction*100)+'%)'},{transform:'none'}],timing);
    }
    sheetPhoto.src = book.image;
  }
  function finishClose() {
    sheet.hidden = true;
    sheetMedia.replaceChildren();
    if (unfolding) {
      unfolding.cancel();
      unfolding = null;
    }
    activeBook = null;
    closing = false;
    closeOnMouseExit = false;
  }
  function showBook(book, direction = 0) {
    const opening = sheet.hidden || closing;
    const resuming = closing && activeBook === book && unfolding && canSlide;
    closing = false;
    activeBook = book;
    swapArtwork(book, direction);
    sheet.dataset.book = book.key;
    sheet.querySelector('.sheet-kind').textContent = book.category + ' · ' + book.kind;
    sheet.querySelector('h3').replaceChildren(...Array.from(book.title.childNodes, node => node.cloneNode(true)));
    sheet.querySelector('.sheet-question').textContent = book.question;
    sheet.querySelector('.sheet-summary').textContent = book.summary;
    if (!resuming) sheetMedia.replaceChildren(document.getElementById('media-' + book.key).content.cloneNode(true));
    sheet.querySelector('.sheet-page').scrollTop = 0;
    sheet.querySelector('.sheet-count').textContent = (books.indexOf(book) + 1) + ' / ' + books.length;
    preview.dataset.brief = book.key;
    sheetLink.href = book.url;
    sheetLink.textContent = book.linkLabel;
    books.forEach(item => item.button.setAttribute('aria-expanded', String(item === book)));
    sheet.hidden = false;
    sheet.inert = false;
    if (!direction) sheetClose.focus({preventScroll:true});
    covers.inert = true;
    galleryHeading.inert = true;
    if (resuming) {
      unfolding.reverse();
    } else {
      unfolding?.cancel();
      unfolding = opening && canSlide ? slideFromCover(book) : null;
    }
    introduction.getAnimations?.().forEach(animation => animation.cancel());
    if (!resuming && canSlide) {
      introduction.animate([
        {opacity:0,transform:'translateX('+((direction || 1)*36)+'px)'},
        {opacity:1,transform:'none'}
      ],{duration:opening?460:360,delay:opening?95:35,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'});
    }
  }
  function hideBook(restoreFocus) {
    if (!activeBook || closing) return;
    const book = activeBook;
    closing = true;
    covers.inert = false;
    galleryHeading.inert = false;
    book.button.setAttribute('aria-expanded','false');
    if (restoreFocus) book.button.focus({preventScroll:true});
    sheet.inert = true;
    if (!canSlide) {
      finishClose();
      return;
    }
    if (!unfolding || unfolding.playState === 'finished') {
      unfolding?.cancel();
      unfolding = slideFromCover(book);
      unfolding.currentTime = slideDuration;
    }
    if (Number(unfolding.currentTime) < 1) {
      finishClose();
      return;
    }
    const retracting = unfolding;
    retracting.reverse();
    retracting.finished.then(() => {
      if (closing && unfolding === retracting) finishClose();
    }, () => {}); // A new selection may cancel the return trip.
  }
  for (const book of books) {
    book.button.addEventListener('click', () => showBook(book));
  }
  exhibition.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse' && closeOnMouseExit && !drawer.open) {
      hideBook(sheet.contains(document.activeElement));
    }
  });
  shelf.addEventListener('pointerdown', event => { closeOnMouseExit = event.pointerType === 'mouse'; });
  shelf.addEventListener('keydown', () => { closeOnMouseExit = false; });
  sheet.addEventListener('focusout', event => {
    if (event.relatedTarget && !shelf.contains(event.relatedTarget) && !drawer.contains(event.relatedTarget)) hideBook(false);
  });
  sheetClose.addEventListener('click', () => hideBook(true));
  sheet.querySelectorAll('[data-book-step]').forEach(button => {
    button.addEventListener('click', () => {
      const index = (books.indexOf(activeBook) + Number(button.dataset.bookStep) + books.length) % books.length;
      showBook(books[index], Number(button.dataset.bookStep));
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && activeBook && !drawer.open) {
      event.preventDefault();
      hideBook(sheet.contains(document.activeElement));
    }
  });
  document.addEventListener('pointerdown', event => {
    if (activeBook && !drawer.open && !shelf.contains(event.target)) hideBook(false);
  });
  const openFeaturedBook = event => {
    closeOnMouseExit = event?.pointerType === 'mouse';
    showBook(books[0]);
  };
  document.querySelectorAll('a[href="#tavern-heros-project"]').forEach(link => link.addEventListener('click', openFeaturedBook));
  if (location.hash === '#tavern-heros-project') openFeaturedBook();

  const record = document.querySelector('.shield-record');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (record) {
  const viewport = record.querySelector('.record-viewport');
  const slides = [...record.querySelectorAll('.record-slide')];
  const counter = record.querySelector('.record-counter');
  const status = record.querySelector('[data-slide-status]');
  let current = 0;
  function showSlide(step) {
    current = (current + step + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== current; });
    const slide = slides[current];
    counter.textContent = (current + 1) + ' / ' + slides.length;
    if (step) {
      status.textContent = counter.textContent + ', ' + slide.querySelector('.stage-label').textContent;
      if (slide.animate) {
        slide.getAnimations().forEach(animation => animation.cancel());
        const distance = reducedMotion.matches ? 8 : 40;
        slide.animate([
          {transform: 'translateX(' + (step * distance) + 'px)', opacity: .65},
          {transform: 'translateX(0)', opacity: 1}
        ], {duration: reducedMotion.matches ? 160 : 320, easing: 'cubic-bezier(.2,.75,.3,1)'});
      }
    }
  }
  record.querySelector('.record-controls').hidden = false;
  showSlide(0);
  record.querySelectorAll('[data-step]').forEach(button => {
    button.addEventListener('click', () => showSlide(Number(button.dataset.step)));
  });
  record.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showSlide(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  let contact = null;
  viewport.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || !event.isPrimary) return;
    contact = {id: event.pointerId, x: event.clientX, y: event.clientY};
  });
  viewport.addEventListener('pointerup', event => {
    if (contact?.id !== event.pointerId) return;
    const dx = event.clientX - contact.x;
    const dy = event.clientY - contact.y;
    contact = null;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) showSlide(dx < 0 ? 1 : -1);
  });
  viewport.addEventListener('pointercancel', () => { contact = null; });

  }
  const tree = document.querySelector('.workspace-tree');
  const picker = tree.querySelector('.path-picker');
  const pathButtons = [...picker.querySelectorAll('button')];
  const caption = document.querySelector('#path-caption');
  const captions = {
    all: caption.textContent,
    codex: 'Codex가 Higgsfield로 시안을 탐색하고, Tripo·Meshy와 Blender로 모델을 준비합니다. ElevenLabs로 음성과 효과음을 만듭니다.',
    claude: 'Claude Code가 Blender·Cascadeur에서 동작을 다루고, Unity 또는 Unreal Engine에서 입력과 판정을 연결합니다.'
  };
  const diagrams = tree.querySelectorAll('.tree-landscape, .tree-portrait');
  function traceConnections(diagram, path) {
    diagram.classList.remove('route-pending');
    if (!diagram.animate) return;
    const root = diagram.querySelector('use[data-branch="shared"]');
    const trunkTime = reducedMotion.matches ? 150 : 250;
    const toolTime = 1500 / 4;
    for (const animation of diagram.getAnimations({subtree:true})) {
      if (animation.id === 'route-trace') animation.cancel();
    }
    root.animate([{opacity:.65}, {opacity:1}], {id:'route-trace', duration:trunkTime});
    const connections = [];
    for (const line of diagram.querySelectorAll('line[data-branch]')) {
      const {branch, from, to} = line.dataset;
      if (path !== 'all' && branch !== path) continue;
      const node = diagram.querySelector(`use[data-branch="${branch}"][href="#wn-${to}"]`);
      connections.push({line, node, trunk:from === 'studio', x:node.x.baseVal.value, y:node.y.baseVal.value});
    }
    connections.sort((a, b) => a.y - b.y || a.x - b.x);
    const nextToolAt = new Map();
    for (const {line, node, trunk} of connections) {
      const duration = trunk ? trunkTime : toolTime;
      const branch = line.dataset.branch;
      const delay = trunk ? 0 : (nextToolAt.get(branch) ?? trunkTime);
      if (!trunk) nextToolAt.set(branch, delay + duration);
      line.animate([
        {strokeDasharray:'1 1', strokeDashoffset:'1'},
        {strokeDasharray:'1 1', strokeDashoffset:'0'}
      ], {id:'route-trace', duration, delay, easing:'ease-in-out', fill:'backwards'});
      node.animate([
        {opacity:.15}, {opacity:1}
      ], {id:'route-trace', duration:duration * .35, delay:delay + duration * .65, fill:'backwards'});
    }
  }
  picker.hidden = false;
  pathButtons.forEach(button => {
    button.addEventListener('click', () => {
      const path = button.dataset.path;
      tree.dataset.path = path;
      pathButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      caption.textContent = captions[path];
      for (const diagram of diagrams) traceConnections(diagram, path);
    });
  });

  const skillGroups = [...document.querySelectorAll('.skill-branch')];
  const expandSkills = document.getElementById('skills-expand');
  let skillPreview = null;
  let skillHoverTimer;
  function updateSkillButton() {
    expandSkills.textContent = skillGroups.every(group => group.open) ? '모두 접기' : '모두 펼치기';
  }
  for (const group of skillGroups) {
    const summary = group.querySelector('summary');
    summary.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || group.open || skillHoverTimer) return;
      skillHoverTimer = setTimeout(() => {
        skillHoverTimer = null;
        if (group.open) return;
        skillPreview = group;
        group.open = true;
      }, 110);
    });
    group.addEventListener('pointerleave', event => {
      if (event.pointerType !== 'mouse') return;
      cancelSkillHover();
      if (skillPreview === group) {
        skillPreview = null;
        group.open = false;
      }
    });
    summary.addEventListener('click', () => {
      cancelSkillHover();
      if (skillPreview === group) skillPreview = null;
    });
    group.addEventListener('toggle', updateSkillButton);
  }
  function cancelSkillHover() {
    clearTimeout(skillHoverTimer);
    skillHoverTimer = null;
  }
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    cancelSkillHover();
    if (skillPreview) {
      skillPreview.open = false;
      skillPreview = null;
    }
  });
  expandSkills.hidden = false;
  expandSkills.addEventListener('click', () => {
    const expand = !skillGroups.every(group => group.open);
    cancelSkillHover();
    skillPreview = null;
    skillGroups.forEach(group => { group.open = expand; });
    updateSkillButton();
  });

  if ('IntersectionObserver' in window) {
    const watchOrigin = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.intersectionRatio >= .7) traceConnections(entry.target.ownerSVGElement, tree.dataset.path || 'all');
      }
    }, {threshold:.7, rootMargin:'0px 0px -5% 0px'});
    for (const diagram of diagrams) {
      diagram.classList.add('route-pending');
      watchOrigin.observe(diagram.querySelector('use[data-branch="shared"]'));
    }

  }

  const methods = document.querySelector('.ai-method');
  methods.classList.add('method-drawing');
  const methodSteps = [...methods.children];
  const gameList = document.querySelector('#played-games .game-list');
  const gameRows = [...gameList.children];
  const genreButtons = [...document.querySelectorAll('[data-genre]')];
  const gameSearch = document.querySelector('#game-search');
  const gameResults = document.querySelector('#game-results');
  const gameEmpty = document.querySelector('#game-empty');
  let selectedGenre = 'all';
  let matchingGames = [];
  let revealedGames = 0;
  let gameFilterChanged = true;

  function filterGames() {
    const query = gameSearch.value.trim().toLocaleLowerCase();
    matchingGames = gameRows.filter(row => {
      const matchesGenre = selectedGenre === 'all' || row.dataset.genres.split(',').includes(selectedGenre);
      row.hidden = !(matchesGenre && row.dataset.name.toLocaleLowerCase().includes(query));
      return !row.hidden;
    });
    gameEmpty.hidden = matchingGames.length > 0;
    gameResults.textContent = `${selectedGenre === 'all' ? '전체' : selectedGenre}${query ? ' / 검색 결과' : ''} / ${matchingGames.length}개 게임`;
    gameFilterChanged = true;
    scheduleScrollMotion();
  }
  function syncGameRows(threshold) {
    // As the footer approaches, reveal even the last row on a tall screen.
    const remainingScroll = Math.max(0, document.documentElement.scrollHeight - window.scrollY - window.innerHeight);
    const readingLine = Math.max(threshold, window.innerHeight - remainingScroll);
    let count = gameFilterChanged ? 0 : revealedGames;
    while (count > 0 && matchingGames[count - 1].getBoundingClientRect().top > readingLine) count--;
    while (count < matchingGames.length && matchingGames[count].getBoundingClientRect().top <= readingLine) count++;

    const start = gameFilterChanged ? 0 : Math.min(revealedGames, count);
    const end = gameFilterChanged ? matchingGames.length : Math.max(revealedGames, count);
    for (let i = start; i < end; i++) matchingGames[i].classList.toggle('in-view', i < count);
    revealedGames = count;
    gameFilterChanged = false;
  }
  genreButtons.forEach(button => button.addEventListener('click', () => {
    selectedGenre = button.dataset.genre;
    genreButtons.forEach(item => {
      const selected = item === button;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    filterGames();
  }));
  gameSearch.addEventListener('input', filterGames);

  const timelines = [...document.querySelectorAll('.wf-timeline')].map(list => {
    list.classList.add('wf-drawing');
    return {list, points:[...list.querySelectorAll('.wf-point')], shown:0, direction:0, readyAt:0};
  });
  let scrollFrame = 0;
  function syncScrollMotion(now) {
    scrollFrame = 0;
    const threshold = window.innerHeight * .85;
    syncGameRows(threshold);
    const beat = reducedMotion.matches ? 85 : 155;
    for (const item of methodSteps) {
      item.classList.toggle('in-view', item.getBoundingClientRect().top <= threshold);
    }
    for (const track of timelines) {
      const bounds = track.list.getBoundingClientRect();
      let count = 0;
      if (bounds.bottom <= threshold) count = track.points.length;
      else if (bounds.top <= threshold) {
        count = track.points.filter(point => {
          const box = point.getBoundingClientRect();
          return box.top + box.height / 2 <= threshold;
        }).length;
      }
      if (count === track.shown) continue;
      const direction = Math.sign(count - track.shown);
      let start = direction === track.direction ? Math.max(now, track.readyAt) : now;
      while (track.shown !== count) {
        const point = track.points[direction > 0 ? track.shown : track.shown - 1];
        const step = point.parentElement;
        const box = step.getBoundingClientRect();
        const visible = box.bottom > 0 && box.top < window.innerHeight;
        const junction = (point.offsetTop + point.offsetHeight / 2) / box.height;
        step.style.setProperty('--rail-time', beat + 'ms');
        step.style.setProperty('--flow-delay', (visible ? start - now : 0) + 'ms');
        step.style.setProperty('--junction-offset', Math.round(junction * beat) + 'ms');
        step.classList.toggle('wf-arrived', direction > 0);
        track.shown += direction;
        if (visible) start += beat;
      }
      track.direction = direction;
      track.readyAt = start;
    }
  }
  function scheduleScrollMotion() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(syncScrollMotion);
  }
  window.addEventListener('scroll', scheduleScrollMotion, {passive:true});
  window.addEventListener('resize', scheduleScrollMotion);
  window.addEventListener('pageshow', scheduleScrollMotion);
  if ('ResizeObserver' in window) {
    const reflow = new ResizeObserver(scheduleScrollMotion);
    reflow.observe(document.querySelector('main'));
    reflow.observe(gameList);
    timelines.forEach(track => reflow.observe(track.list));
  }
  gameList.classList.add('game-drawing');
  filterGames();
})();
