const groups = {
  economy: /\d+(?:[·/–]\d+)*\s?골드|최대 골드|선술집 레벨업|황금 합성|황금 기물|대장 팩|후보 교체|영구 증원|영구 성장|성장 \+\d+/,
  tactics: /1인 PvE 오토배틀러|적 예고|2열 (?:횡대|종대)|전열·후열|자동 전투|출정 준비|보호막(?:\s?[+−-]?\d+(?:\/\d+)*)?|회복\s?\d+|공격력 [+-]\d+|첫 기본 공격 적중|재사용 대기|첫 교전|타깃 선택|시전 완료/,
  danger: /침식도(?:\s?\d+%)?|외신의 균열|삼키는 자|분열체(?:\s?\d+기)?|동시 전멸|원정 실패|심해 파동|(?:라운드 )?권능(?:\s?\d+종)?/,
  development: /20Hz(?: 고정 틱)?|같은 시드|이벤트 CSV|100대100|Android(?: APK)?|실기기(?: 설치| 검증)?|프레임 간격|설계 단계|동시 타격|논리 픽셀|최근접 보간|9슬라이스|스프라이트 시트|실루엣|Cavern Text|배경음악|효과음|60ms/,
};

const phrases = new RegExp(
  Object.entries(groups).map(([group, expression]) => '(?<' + group + '>' + expression.source + ')').join('|'),
  'g',
);
const blocks = 'p, li, dd, .effect-table td, .catalog-effect-table td';
const excluded = 'a, button, code, pre, mark, label, [aria-live], [role="status"]';
const seen = new Set();

export function highlightKeyTerms(root) {
  for (const block of root.querySelectorAll(blocks)) {
    const candidates = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (candidates.nextNode()) {
      const text = candidates.currentNode;
      const parent = text.parentElement;
      if (parent.closest(blocks) === block && !parent.closest(excluded)) textNodes.push(text);
    }

    let highlighted = 0;
    for (const text of textNodes) {
      const value = text.data;
      const fragment = document.createDocumentFragment();
      let end = 0;
      for (const match of value.matchAll(phrases)) {
        const word = match[0];
        const term = word.match(/권능|보호막|분열체|황금 합성/)?.[0] ?? word;
        if (seen.has(term)) continue;
        const mark = document.createElement('mark');
        mark.className = 'key-term';
        mark.dataset.tone = Object.keys(match.groups).find(group => match.groups[group]);
        mark.textContent = word;
        fragment.append(value.slice(end, match.index), mark);
        end = match.index + word.length;
        seen.add(term);
        if (++highlighted === 2) break;
      }
      if (end) {
        fragment.append(value.slice(end));
        text.replaceWith(fragment);
      }
      if (highlighted === 2) break;
    }
  }
}
