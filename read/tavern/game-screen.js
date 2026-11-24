(() => {
  const screen = document.querySelector('main.game-screen');
  if ((location.origin === 'http://localhost:17869' || location.hostname === 'appassets.androidplatform.net')
    && location.pathname.startsWith('/mobile-game/')) {
    document.documentElement.setAttribute('data-mobile-edition', '');
  }
  const profiles = {
    iphone16: { label: 'iPhone 16', width: 852, height: 393, left: 52, right: 52, bottom: 21 },
    pixel9: { label: 'Pixel 9', width: 808, height: 360, left: 30, right: 24, bottom: 12 },
  };
  const params = new URL(location.href).searchParams;
  const requested = params.get('phone');
  const defaultPhone = screen.dataset.phoneDefault;
  const desktopPreview = matchMedia('(pointer: fine)').matches && !params.has('captain');
  let active = Object.hasOwn(profiles, requested) ? requested : desktopPreview ? defaultPhone : null;
  if (!active || !Object.hasOwn(profiles, active)) return;

  const root = document.documentElement;
  const links = [...screen.querySelectorAll('a[data-screen-link]')];
  const chooser = document.createElement('nav');
  chooser.className = 'phone-controls';
  chooser.setAttribute('aria-label', '가로 휴대폰 화면 기준');
  const buttons = Object.entries(profiles).map(([key, { label, width, height }]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label + ' · ' + width + ' × ' + height;
    button.addEventListener('click', () => applyProfile(key));
    chooser.append(button);
    return [key, button];
  });
  document.body.prepend(chooser);

  function fit() {
    const { width, height } = profiles[active];
    const toolbarRoom = chooser.offsetHeight + 20;
    const availableHeight = root.clientHeight - toolbarRoom;
    const scale = Math.max(0, Math.min(1, (root.clientWidth - 20) / width, (availableHeight - 20) / height));
    root.style.setProperty('--phone-x', Math.round((root.clientWidth - width * scale) / 2) + 'px');
    root.style.setProperty('--phone-y', Math.round(toolbarRoom + (availableHeight - height * scale) / 2) + 'px');
    root.style.setProperty('--phone-scale', String(scale));
  }

  function applyProfile(key) {
    active = key;
    const { width, height, left, right, bottom } = profiles[key];
    root.style.setProperty('--phone-width', width + 'px');
    root.style.setProperty('--phone-height', height + 'px');
    root.style.setProperty('--phone-left', left + 'px');
    root.style.setProperty('--phone-right', right + 'px');
    root.style.setProperty('--phone-bottom', bottom + 'px');
    root.dataset.phonePreview = key;
    for (const [value, button] of buttons) button.setAttribute('aria-pressed', String(value === key));
    for (const link of links) {
      const href = new URL(link.href);
      href.searchParams.set('phone', key);
      link.href = href.href;
    }
    fit();
  }

  applyProfile(active);
  new ResizeObserver(fit).observe(chooser);
  window.addEventListener('resize', fit);
})();
