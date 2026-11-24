const storageKey = 'tavern-heros:lobby-settings';

export function readSettings() {
  const settings = { music: 100, effects: 100, contrast: false };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    for (const key of Object.keys(settings)) {
      const value = saved?.[key];
      if (typeof value !== typeof settings[key]) continue;
      if (typeof value === 'number') {
        if (Number.isFinite(value)) settings[key] = Math.min(100, Math.max(0, Math.round(value)));
      } else settings[key] = value;
    }
  } catch {
    // This preview can operate without browser storage.
  }
  return settings;
}

export function mountSettings(panel, surface) {
  const settings = readSettings();
  for (const control of panel.querySelectorAll('[data-setting]')) {
    const key = control.dataset.setting;
    const isToggle = control.type === 'checkbox';
    const output = control.parentElement.querySelector('output');
    if (isToggle) {
      control.checked = settings[key];
      surface.toggleAttribute('data-high-contrast', control.checked);
    } else {
      control.value = settings[key];
      output.value = control.value + '%';
    }

    control.addEventListener('input', () => {
      if (isToggle) {
        settings[key] = control.checked;
        surface.toggleAttribute('data-high-contrast', control.checked);
      } else {
        settings[key] = control.valueAsNumber;
        output.value = control.value + '%';
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(settings));
      } catch {
        // The current preview still reflects the new setting.
      }
    });
  }

  const fullscreen = panel.querySelector('.fullscreen-toggle');
  const status = panel.querySelector('#fullscreen-status');
  function updateFullscreen() {
    fullscreen.disabled = !document.fullscreenEnabled;
    fullscreen.textContent = document.fullscreenElement ? '전체 화면 종료' : '전체 화면';
    status.hidden = !fullscreen.disabled;
  }
  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      status.hidden = false;
    }
  });
  document.addEventListener('fullscreenchange', updateFullscreen);
  updateFullscreen();
}
