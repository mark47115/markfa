const results = {
  hire: ['황금 기물 1장, 2골드 남음', '묘목 돌봄이 3장이 한 장으로 합쳐져 배치 자리 한 칸이 비고, 고용 후보는 1등급을 유지한다.'],
  upgrade: ['선술집 2레벨, 2골드 남음', '2등급 기물이 고용 후보에 추가되고 탁자가 3개에서 4개로 늘어난다. 일반 묘목 돌봄이 두 장은 그대로 출전할 수 있다.'],
};
const resultTitle = document.querySelector('#choice-result strong');
const resultDetail = document.querySelector('#choice-result p');
const choices = document.querySelectorAll('[data-tavern-choice]');
for (const choice of choices) {
  choice.addEventListener('click', () => {
    const [title, detail] = results[choice.dataset.tavernChoice];
    resultTitle.textContent = title;
    resultDetail.textContent = detail;
    for (const option of choices) option.setAttribute('aria-pressed', String(option === choice));
  });
}

const picker = document.querySelector('#overview-round-picker');
const mapArt = document.querySelector('#overview-map-art');
const mapTitle = document.querySelector('#overview-map-detail h3');
const mapGold = document.querySelector('#overview-map-gold');
const mapErosion = document.querySelector('#overview-map-erosion');
const mapWave = document.querySelector('#overview-map-wave');
const mapStatus = document.querySelector('#overview-round-status');

async function loadRounds() {
  const response = await fetch('battle-maps.json');
  if (!response.ok) throw new Error('Round data unavailable');
  const { rounds } = await response.json();
  if (!rounds?.length) {
    mapStatus.textContent = '선택할 수 있는 추가 전장이 없다.';
    return;
  }
  picker.replaceChildren(...rounds.map(({ id, name }, index) => new Option((index + 1) + '라운드 ' + name, id)));
  picker.addEventListener('change', () => {
    const round = rounds[picker.selectedIndex];
    const number = picker.selectedIndex + 1;
    mapArt.src = 'media/battle-maps/v12/' + round.id + '.png';
    mapArt.alt = number + '라운드 전장 ' + round.name;
    mapTitle.textContent = number + '라운드 ' + round.name;
    mapGold.textContent = (number + 2) + '골드';
    mapErosion.textContent = '+' + (8 + 2 * (number - 1)) + '%p';
    mapWave.setAttribute('href', '#atlas/' + round.id);
  });
  picker.disabled = false;
  mapStatus.hidden = true;
}
loadRounds().catch(() => { mapStatus.textContent = '전장 목록을 불러오지 못했다.'; });
