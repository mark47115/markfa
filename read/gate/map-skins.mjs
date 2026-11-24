const skinArt = id => ({
  joined: 'media/map-skins/pixel-v2/' + id + '-joined.png',
  own: 'media/map-skins/pixel-v2/' + id + '-own.png',
  opponent: 'media/map-skins/pixel-v2/' + id + '-opponent.png',
  mine: 'media/map-skins/pixel-v2/' + id + '-mine.png',
});

export const mapSkins = Object.freeze({
  subway: {
    title: '폐쇄된 환승역',
    note: '황동 안전선과 보랏빛 게이트 · 지하 정비 광산',
    art: skinArt('subway'),
  },
  'red-gate': {
    title: '레드 게이트 · 설원',
    note: '붉은 석문과 얼어붙은 숲 · 푸른 빙정 광산',
    art: skinArt('red-gate'),
  },
  museum: {
    title: '라그나로크 · 미술관 균열',
    note: '액자와 푸른 균열 · 미술관 지하의 청록 광맥',
    art: skinArt('museum'),
    finish: { edge: '#4c8487', frame: '#29484c', well: '#14282e', trim: '#72aaa4', shadow: '#0c1a20', highlight: '#c2f4e7', accent: '#589c93' },
  },
  cartenon: {
    title: '카르테논 신전',
    note: '석상 부조와 푸른 횃불 · 신전 지하의 청람석',
    art: skinArt('cartenon'),
    finish: { edge: '#6b849b', frame: '#394659', well: '#1b2534', trim: '#91a9b7', shadow: '#101925', highlight: '#dcefff', accent: '#6692bb' },
  },
  'demon-castle': {
    title: '악마성 · 잿빛 거리',
    note: '그을린 아치와 주황 불씨 · 현무암의 구릿빛 광맥',
    art: skinArt('demon-castle'),
    finish: { edge: '#955c45', frame: '#50352e', well: '#2e1e1c', trim: '#c3824e', shadow: '#221313', highlight: '#ffdbad', accent: '#b45e3f' },
  },
  'jeju-hive': {
    title: '제주 · 개미굴',
    note: '검은 현무암과 호박색 층리 · 굴 안쪽의 호박 광맥',
    art: skinArt('jeju-hive'),
    finish: { edge: '#897455', frame: '#464030', well: '#292317', trim: '#bda269', shadow: '#1b1710', highlight: '#ffe6a9', accent: '#9a793d' },
  },
  'red-knight': {
    title: '전직 던전 · 붉은 기사 회랑',
    note: '철제 기둥과 자주색 깃발 · 성채 지하의 석류석 광맥',
    art: skinArt('red-knight'),
    finish: { edge: '#916381', frame: '#473044', well: '#261e31', trim: '#b584a1', shadow: '#180f20', highlight: '#f5cae2', accent: '#9e4f6e' },
  },
});

export function readMapSkin(value) {
  return Object.hasOwn(mapSkins, value) ? value : 'subway';
}

export function mapSkinAsset(skin, view) {
  return new URL(mapSkins[skin].art[view], import.meta.url);
}
