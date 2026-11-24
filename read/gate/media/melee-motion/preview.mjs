const phases = {
  windup: '준비', release: '체중 이동', contact: '타격', followThrough: '후속 자세', recovery: '복귀',
  nock: '화살 걸기', draw: '시위 당기기', aim: '조준 유지', loose: '시위 놓기', recoil: '반동',
  readyStaff: '지팡이 준비', extendStaff: '앞으로 내밀기', liftStaff: '위로 들어 올리기', cast: '발동',
  brace: '방패 들어 버티기', holdGuard: '자세 유지',
};

export function phaseAt(track, time) {
  const phase = Object.entries(track?.phaseTimesMs ?? {}).findLast(([, start]) => start <= time);
  return phase ? phases[phase[0]] : '';
}
