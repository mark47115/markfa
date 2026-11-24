window.mountTavernBattleAudio = function (scope, { signal, setTrack } = {}) {
  const search = scope.querySelector('[data-audio-search]');
  const roster = scope.querySelector('[data-audio-unit]');
  const motions = scope.querySelector('[data-audio-motion]');
  const player = scope.querySelector('[data-audio-player]');
  const download = scope.querySelector('[data-audio-download]');
  const phase = scope.querySelector('[data-audio-phase]');
  const status = scope.querySelector('[data-audio-status]');
  const root = 'media/battle-audio/v2/';
  const timings = { contact: '공격이 명중했을 때', release: '무기나 투사체가 손을 떠날 때', cast: '공격 또는 기술이 발동했을 때' };
  let profiles = [];
  let current;

  function updateAudio() {
    const motion = current?.motions[Number(motions.value)];
    if (!motion) return;
    const file = root + 'sfx/' + motion.cue + '.wav';
    if (setTrack) setTrack(player, file);
    else if (player.getAttribute('src') !== file) player.src = file;
    download.href = file;
    phase.textContent = timings[motion.phase];
  }

  function updateMotions() {
    current = profiles.find(unit => unit.id === roster.value);
    motions.replaceChildren(...(current?.motions ?? []).map((motion, index) => new Option(motion.label, index)));
    motions.disabled = !current;
    player.hidden = download.hidden = !current;
    if (!current) {
      player.pause();
      phase.textContent = '';
    }
    updateAudio();
  }

  function filter() {
    const old = roster.value;
    const query = search.value.trim().toLowerCase();
    const units = profiles.filter(unit => (unit.name + ' ' + unit.id).toLowerCase().includes(query));
    roster.replaceChildren(...units.map(unit => new Option(
      unit.name + (unit.side === 'enemy' ? ' · 공허군' : ' · 아군'), unit.id)));
    if (units.some(unit => unit.id === old)) roster.value = old;
    roster.disabled = units.length === 0;
    status.hidden = units.length > 0;
    status.textContent = units.length > 0 ? '' : '검색에 맞는 유닛이 없습니다.';
    updateMotions();
  }

  search.addEventListener('input', filter);
  roster.addEventListener('change', updateMotions);
  motions.addEventListener('change', updateAudio);
  const players = [...scope.querySelectorAll('audio')];
  for (const active of players) active.addEventListener('play', () => {
    for (const other of players) if (other !== active) other.pause();
  });
  fetch(root + 'profiles.json', { signal }).then(response => {
    if (!response.ok) throw new Error('Missing profiles');
    return response.json();
  }).then(data => {
    profiles = data.units.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    search.disabled = false;
    filter();
  }).catch(() => {
    if (signal?.aborted) return;
    status.hidden = false;
    status.textContent = '유닛 목록을 불러오지 못했습니다. 위의 교전 믹스는 들을 수 있습니다.';
  });
};

if (document.querySelector('body > main [data-audio-search]')) window.mountTavernBattleAudio(document.querySelector('body > main'));
