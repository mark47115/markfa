window.mountTavernGameData = function (root, { tab, signal, inline = false } = {}) {
  const links = [...root.querySelectorAll('[data-table]')];
  const search = root.querySelector('#data-query');
  const result = root.querySelector('#table-counter');
  const region = root.querySelector('.table-scroll');
  const table = region.querySelector('table');
  const pager = root.querySelector('.data-pages');
  const buttons = [...pager.querySelectorAll('button')];
  const workbook = root.querySelector('#workbook-download');
  if (tab !== undefined && !inline) for (const link of links) link.hash = 'data/' + link.hash.slice(1);
  const size = 25;
  let current;
  let page = 0;

  const rows = (values, tag, wide, withScope) => {
    const tr = document.createElement('tr');
    values.forEach((value, index) => {
      const cell = document.createElement(tag);
      if (withScope) cell.scope = 'col';
      if (wide.has(index)) cell.className = 'long';
      else if (typeof value === 'number') cell.className = 'numeric';
      cell.textContent = value ?? '';
      tr.append(cell);
    });
    return tr;
  };
  function show() {
    const hash = inline ? '#' + tab : tab !== undefined ? '#data/' + tab : location.hash;
    const next = links.find(link => link.hash === hash) ?? links[0];
    if (next !== current) {
      page = 0;
      search.value = '';
      current = next;
    }
    for (const link of links) {
      if (link === current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    const name = current.dataset.table;
    const data = window.TavernGameTables?.[name];
    if (!data) {
      result.textContent = '표를 불러오지 못했습니다.';
      return;
    }
    const [headers, ...source] = data;
    const fields = new Set(headers.flatMap((header, index) => header === '조건과 효과' ? [index] : []));
    const query = search.value.trim().toLocaleLowerCase('ko');
    const selected = source.filter(row => row.some(value => String(value ?? '').toLocaleLowerCase('ko').includes(query)));
    const pages = Math.max(1, Math.ceil(selected.length / size));
    page = Math.min(page, pages - 1);
    table.caption.textContent = name + ' 테이블';
    table.tHead.replaceChildren(rows(headers, 'th', fields, true));
    table.tBodies[0].replaceChildren(...selected.slice(page * size, (page + 1) * size).map(row => rows(row, 'td', fields, false)));
    if (!selected.length) {
      const row = rows(['검색 결과가 없습니다.'], 'td', new Set(), false);
      row.firstChild.colSpan = headers.length;
      table.tBodies[0].append(row);
    }
    result.textContent = query ? selected.length + ' / ' + source.length + '개' : source.length + '개';
    pager.querySelector('span').textContent = (page + 1) + ' / ' + pages;
    pager.hidden = pages < 2;
    buttons[0].disabled = page === 0;
    buttons[1].disabled = page + 1 === pages;
    region.scrollTop = 0;
  }
  if (tab === undefined) addEventListener('hashchange', show);
  if (inline) for (const link of links) link.addEventListener('click', event => {
    event.preventDefault();
    tab = link.hash.slice(1);
    show();
  });
  search.addEventListener('input', () => { page = 0; show(); });
  for (const button of buttons) button.addEventListener('click', () => { page += Number(button.dataset.page); show(); });
  if (location.pathname.startsWith('/mobile/view/')) {
    try {
      const contents = Uint8Array.from(atob(window.TavernWorkbookBytes), char => char.charCodeAt(0));
      workbook.href = URL.createObjectURL(new Blob([contents], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }));
      const url = workbook.href;
      signal?.addEventListener('abort', () => URL.revokeObjectURL(url), { once: true });
    } catch {
      workbook.addEventListener('click', event => {
        event.preventDefault();
        root.querySelector('.table-download-status').textContent = '엑셀 파일을 준비하지 못했습니다.';
      });
    }
  }
  show();
};

const standaloneData = document.querySelector('body > .table-report');
if (standaloneData) window.mountTavernGameData(standaloneData);
