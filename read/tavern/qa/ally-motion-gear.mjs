// 보정된 원본 포즈를 2배로 비교해 확인한 장비. 숫자는 로스터의 고정 ID 접미사다.
const rosterGear = {
  seedling: ['seedling-keeper'],
  sword: ['allies-004','allies-073','allies-075','allies-092','allies-094','allies-104','allies-115','allies-118','allies-125','retinues-235','retinues-250','retinues-263'],
  axe: ['allies-064','allies-097','allies-105','allies-127','allies-194','retinues-261'],
  shield: ['shield-deputy','citadel-captain','allies-005','allies-014','allies-030','allies-046','allies-051','allies-054','allies-062','allies-103','allies-109','allies-164','allies-176','allies-179','allies-181','allies-196','allies-211','reforged-shieldbearer','retinues-213','retinues-230','retinues-245','retinues-259','temporary-shield-guard'],
  fist: ['fox-apprentice','allies-035','allies-086','allies-088','allies-098','allies-143','allies-189','allies-191','allies-195','allies-197'],
  beast: ['allies-018','allies-019','allies-022','allies-023','allies-029','allies-034','allies-038','allies-039'],
  bird: ['falcon-lookout','allies-041'],
  bluff: ['allies-036'],
  bow: ['sprout-archer','citadel-archer','allies-008','allies-009','allies-015','allies-021','allies-031','allies-033','allies-122','allies-124','retinues-218','retinues-236','retinues-242','retinues-254'],
  crossbow: ['brook-hunter','allies-013','allies-025','allies-045','allies-053','allies-067','allies-084','allies-106','allies-108','allies-126','allies-166','allies-182','allies-184','retinues-221','retinues-240','retinues-249','retinues-251','retinues-266'],
  spear: ['gate-apprentice','allies-016','allies-020','allies-091','allies-117','allies-119','allies-134','allies-187','allies-202','alloy-spearman','retinues-217'],
  javelin: ['wolf-javelin','allies-072','allies-080','allies-082','retinues-215','retinues-270'],
  sling: ['note-slinger','allies-188','retinues-244','retinues-256'],
  throwing: ['pebble-hurler','allies-136','allies-190'],
  staff: ['allies-010','allies-026','allies-040','allies-068','allies-095','allies-110','allies-156','retinues-223'],
  lantern: ['lantern-priest','allies-101','retinues-262','retinues-267','retinues-269','retinues-272'],
  gun: ['allies-050','allies-055','allies-065','allies-069','allies-140','allies-154','allies-160','allies-168','allies-170','allies-174','allies-178','allies-180','retinues-224','retinues-248','retinues-260','retinues-264'],
  hammer: ['tongs-hammer','allies-032','allies-049','allies-052','allies-056','allies-063','retinues-238'],
  club: ['stone-shoulder-orc','allies-028','allies-102','allies-206','retinues-246'],
  flail: ['retinues-247'],
  hook: ['allies-093','allies-163','retinues-239','retinues-243'],
  claw: ['assembly-robot','allies-047','allies-048','allies-059','allies-133','allies-135','allies-139','allies-142','retinues-225','retinues-229'],
  ram: ['rivet-bot','allies-132','allies-138','allies-141','allies-145','allies-149'],
  machine: ['allies-131','allies-137','allies-144','allies-146','allies-147','allies-148','allies-151','allies-153','allies-155','work-robot'],
  horn: ['seed-horn','allies-161','allies-201','allies-204','allies-212','retinues-253'],
  drum: ['war-drummer','allies-192','allies-193','allies-205','allies-207','allies-208','allies-209','allies-210'],
  bell: ['belltower-sentry','retinues-265'],
  instrument: ['allies-024','retinues-228'],
  flag: ['orc-messenger','allies-107','allies-123','allies-162','allies-169','allies-203','retinues-214'],
  torch: ['retinues-271'],
  rangedGear: ['allies-011','allies-017','allies-027','allies-037','allies-061','allies-150','allies-152','allies-198','retinues-220','retinues-233','retinues-252','retinues-268'],
  gear: [
    'furnace-helper','lynx-scout','ledger-carrier','allies-006','allies-007','allies-012',
    'allies-044','allies-057','allies-058','allies-060','allies-066','allies-074','allies-079','allies-081',
    'allies-083','allies-085','allies-087','allies-089','allies-090','allies-096','allies-116','allies-120','allies-121','allies-128',
    'allies-159','allies-165','allies-167','allies-171','allies-172','allies-173','allies-175','allies-177','allies-183',
    'retinues-216','retinues-219','retinues-222','retinues-226','retinues-227','retinues-231','retinues-232',
    'retinues-234','retinues-237','retinues-241','retinues-255','retinues-257','retinues-258',
  ],
};

const families = {
  seedling:['묘목 장비','carry',['ready']], sword:['검·단검','sword',['cutUp','cutDown','stab']],
  axe:['도끼','axe',['axeDown','axeSweep']], shield:['방패','shield',['bash']],
  fist:['맨손·발톱','fist',['punch']], beast:['짐승형','beast',['bite','paw','rise']],
  bird:['조류','bird',['wing']], bluff:['뿔·옷 장식','carry',['ready']],
  bow:['활','bow',['bow']], crossbow:['석궁','launcher',['crossbow']],
  spear:['창','spear',['stab']], javelin:['투창','javelin',['throw']],
  sling:['투석 장비','launcher',['throwing']], throwing:['투척물','launcher',['throwing']],
  staff:['지팡이','staff',['wand','cast']], lantern:['등불','signal',['lantern']],
  gun:['총·포신','launcher',['gun']], hammer:['망치','tool',['hammer']],
  club:['몽둥이·철퇴','tool',['hammer']], flail:['사슬 철퇴','tool',['flail']],
  hook:['갈고리','tool',['hook']], claw:['집게·기계 팔','machine',['wrench']],
  ram:['기계 돌출부','machine',['ram']], machine:['기계 몸체 장비','carry',['ready']],
  horn:['나팔','signal',['signal']], drum:['북·징','signal',['drum']],
  bell:['종','signal',['signal']], instrument:['악기','signal',['signal']],
  flag:['기수 장비','signal',['flag']], torch:['횃불','signal',['lantern']],
  rangedGear:['손의 원거리 장비','carry',['aim']], gear:['휴대 장비','carry',['ready']],
};
const kits = new Map();
for (const [family, ids] of Object.entries(rosterGear)) for (const id of ids) {
  if (kits.has(id)) throw Error('Equipment assigned twice: ' + id);
  const [equipment,type,attacks] = families[family];
  kits.set(id, { family, equipment, type, attacks });
}

// 오른쪽 기준 88×88 원본에서 실제 손잡이가 있는 점과 장비를 둘러싼 다각형.
const anchors = {
  'allies-125': { grip:[50,63], tip:[61,71], outline:[[50,59],[55,59],[56,62],[56,64],[62,68],[63,73],[57,74],[52,70],[49,68],[47,67],[47,63]] },
  'allies-127': { grip:[52,58], tip:[63,46], outline:[[49,34],[55,34],[57,38],[62,39],[65,43],[65,49],[61,54],[55,54],[55,56],[58,58],[58,63],[56,67],[56,74],[49,74],[49,65],[47,61],[47,58],[49,55],[49,48]] },
  'allies-064': { grip:[53,58], tip:[63,57], outline:[[52,55],[56,53],[59,48],[64,49],[66,57],[64,65],[59,69],[52,66],[51,61]] },
  'allies-097': { grip:[54,57], tip:[64,54], outline:[[55,46],[61,45],[63,48],[66,55],[65,61],[60,63],[56,63],[52,61],[52,56]] },
  'allies-105': { grip:[51,59], tip:[60,47], outline:[[49,38],[54,38],[55,41],[61,42],[62,49],[60,54],[55,54],[54,72],[48,72],[48,56]] },
  'allies-194': { grip:[52,59], tip:[60,44], outline:[[51,39],[57,39],[62,43],[62,49],[57,54],[54,52],[54,72],[49,72],[49,57]] },
  'retinues-239': { grip:[53,59], tip:[59,45], outline:[[50,39],[57,39],[62,42],[62,47],[56,49],[55,72],[50,72],[49,60]] },
  'retinues-261': { grip:[52,61], tip:[59,55], outline:[[52,51],[58,49],[62,53],[64,58],[59,62],[54,64],[50,65],[49,60]] },
  'allies-004': { grip:[52,63], tip:[59,59], outline:[[52,60],[59,55],[62,58],[60,63],[55,68],[51,67],[50,64]] },
  'allies-073': { grip:[54,65], tip:[62,60], outline:[[55,60],[61,57],[64,60],[61,65],[55,69],[52,68],[52,64]] },
  'allies-075': { grip:[53,67], tip:[62,62], outline:[[54,64],[61,59],[64,61],[64,66],[59,71],[53,72],[51,68]] },
  'allies-092': { grip:[54,65], tip:[63,57], outline:[[55,61],[62,54],[65,57],[65,63],[60,68],[54,70],[51,66]] },
  'allies-094': { grip:[53,67], tip:[61,66], outline:[[54,64],[62,62],[66,64],[64,68],[56,72],[50,72],[50,68]] },
  'allies-104': { grip:[52,61], tip:[62,56], outline:[[53,58],[63,52],[65,55],[63,59],[56,66],[51,67],[49,63]] },
  'allies-115': { grip:[51,64], tip:[60,70], outline:[[51,60],[56,61],[63,68],[64,72],[60,75],[54,69],[49,67]] },
  'allies-118': { grip:[52,65], tip:[61,58], outline:[[53,61],[60,55],[64,56],[64,61],[57,68],[52,70],[49,67]] },
  'retinues-235': { grip:[52,63], tip:[54,70], outline:[[52,59],[57,58],[60,62],[58,67],[55,74],[50,72],[49,67]] },
  'retinues-250': { grip:[53,65], tip:[63,59], outline:[[53,62],[62,55],[65,57],[64,64],[58,69],[51,71],[50,67]] },
  'retinues-263': { grip:[54,62], tip:[62,53], outline:[[54,58],[61,50],[65,52],[65,58],[59,65],[54,67],[51,64]] },
  'shield-deputy': { grip:[41,61], tip:[43,60], outline:[[28,55],[34,51],[41,51],[45,55],[45,62],[43,69],[38,74],[30,72],[26,66],[25,60]] },
  'citadel-captain': { grip:[54,61], tip:[63,61], outline:[[53,53],[59,50],[65,54],[68,62],[65,69],[60,75],[54,73],[51,66]] },
  'sprout-archer': { grip:[52,61], tip:[57,61], outline:[[49,48],[57,46],[63,50],[64,64],[60,71],[48,73],[46,68],[48,63],[48,55]] },
  'assembly-robot': { grip:[54,63], tip:[66,61], outline:[[53,56],[61,53],[67,54],[70,60],[70,68],[65,72],[56,71],[52,66]] },
  'gate-apprentice': { grip:[50,62], tip:[51,42], outline:[[47,37],[53,37],[56,45],[53,51],[53,74],[47,74],[46,60],[48,50]] },
  'tongs-hammer': { grip:[37,59], tip:[31,52], outline:[[27,50],[34,47],[40,51],[40,56],[43,59],[40,64],[34,63],[28,61],[25,56]] },
  'retinues-247': { grip:[54,62], tip:[63,69], outline:[[55,54],[60,54],[62,58],[65,62],[69,66],[68,73],[61,76],[57,72],[58,65],[52,65],[51,61]] },
  'allies-050': { grip:[55,62], tip:[70,58], outline:[[52,58],[57,54],[65,55],[72,55],[73,61],[68,64],[61,63],[54,67],[51,65]] },
  'lantern-priest': { grip:[53,59], tip:[60,63], outline:[[53,43],[60,43],[63,47],[61,52],[63,56],[65,58],[65,67],[57,69],[52,64],[52,53]] },
  'allies-026': { grip:[54,62], tip:[62,46], outline:[[52,40],[64,40],[67,45],[63,51],[58,57],[58,74],[52,74],[49,62],[52,56]] },
  'allies-126': { grip:[54,62], tip:[67,62], outline:[[53,55],[61,55],[69,58],[70,65],[63,67],[54,68],[51,64]] },
  'allies-143': { grip:[56,63], tip:[66,65], outline:[[55,61],[60,58],[67,58],[69,65],[67,70],[60,72],[55,69],[53,65]] },
  'note-slinger': { grip:[53,61], tip:[63,53], outline:[[52,55],[57,50],[64,48],[65,52],[60,59],[57,65],[51,66],[49,62]] },
  'allies-179': { grip:[42,61], tip:[45,64], outline:[[30,55],[40,54],[47,58],[48,65],[45,72],[37,75],[29,72],[26,64]] },
};
export function verifiedGear(id) {
  const entry = kits.get(id);
  if (!entry) throw Error('Unit needs visual equipment review: ' + id);
  return { ...entry, anchor: anchors[id] };
}
export const reviewedCount = kits.size;
