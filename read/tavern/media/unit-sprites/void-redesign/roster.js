const roster = [
  {
    "id": "the-devourer",
    "name": "삼키는 자 · 1페이즈",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit",
      "transform"
    ],
    "actions": {
      "idle": "엇물린 뼈판 두 장이 세로 입을 잠근 낮은 봉인체",
      "walk": "네 다리를 낮게 굽히고 앞발부터 무게를 옮긴다",
      "attack": "뼈판 아래로 앞턱을 내밀어 물기",
      "skill": "오른쪽 뼈판을 세우고 앞발을 박아 도발",
      "hit": "큰 오른쪽 갑각이 닫히고 작은 왼쪽 판이 걸쇠처럼 맞물린다"
    },
    "tier": 5
  },
  {
    "id": "the-devourer-awakened",
    "name": "삼키는 자 · 2페이즈",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit",
      "death"
    ],
    "actions": {
      "idle": "긴 네 다리 위에 등판과 두 겹의 세로턱이 열린 거체",
      "walk": "무거운 앞발이 늦게 착지하고 뒤의 두 발이 번갈아 몸을 밀어 올린다",
      "attack": "바깥턱으로 붙잡고 안턱으로 물기",
      "skill": "뼈판을 젖혀 입 속 청록 핵을 드러내기",
      "hit": "맞은 쪽 턱을 먼저 거두고 네 발로 무게를 다시 받는다"
    },
    "tier": 5
  },
  {
    "id": "rift-tick",
    "name": "균열 진드기",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "한쪽 뼈눈을 덮은 납작한 씨앗 껍질",
      "walk": "네 발을 굽혀 배를 들고, 뒷발을 펴서 앞발부터 착지",
      "attack": "앞다리 튕겨 덮치기",
      "skill": "다리 접고 낮게 튀기",
      "hit": "맞은 쪽 앞발을 몸밑으로 접고 반대 발로 버틴다"
    },
    "tier": 1
  },
  {
    "id": "ruin-shell",
    "name": "폐허 등껍질",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "깨진 아치석을 등에 진 낮은 네발짐승",
      "walk": "몸이 먼저 일어서고 무거운 등판이 뒤따른다",
      "attack": "패인 등판으로 밀기",
      "skill": "등판 세워 도발",
      "hit": "패인 모서리를 안으로 돌려 충격을 옆으로 보낸다"
    },
    "tier": 1
  },
  {
    "id": "imperfect-hybrid",
    "name": "불완전한 혼종",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "작은 몸 왼편에 절반만 봉합된 큰 집게",
      "walk": "가벼운 발이 먼저 옮겨지고 큰 집게가 바닥에서 떨어진다",
      "attack": "큰 집게 벌려 찍기",
      "skill": "봉합 갑각에 기대 집게 내리기",
      "hit": "집게를 디뎌 기울어진 몸을 되세운다"
    },
    "tier": 2
  },
  {
    "id": "veil-wraith",
    "name": "장막 유령",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "한쪽이 길게 찢어진 종 모양 막과 매달린 핵",
      "walk": "핵이 뜨고 막 아래끝이 늦게 접히는 부유",
      "attack": "천막 끝 휘감기",
      "skill": "떠 있는 핵으로 천막 다시 걸기",
      "hit": "핵이 안쪽으로 숨고 막이 빈 자리를 덮는다"
    },
    "tier": 2
  },
  {
    "id": "broken-crown",
    "name": "깨진 왕관",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "등에 기울어진 삼지관을 얹은 넓적한 게",
      "walk": "낮은 게걸음마다 왕관이 반 박자 늦게 기운다",
      "attack": "게 집게로 옆을 긁기",
      "skill": "세 갈래 관 내보이며 도발",
      "hit": "작은 집게를 바닥에 짚어 왕관이 넘어가는 것을 막는다"
    },
    "tier": 3
  },
  {
    "id": "abyssal-choir",
    "name": "심연 합창단",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "서로 다른 높이에 놓인 세 개의 관악기 모양 입",
      "walk": "아랫입부터 숨을 들이마시며 몸 전체가 떠오른다",
      "attack": "세 입을 시간차로 벌려 덮치기",
      "skill": "남은 두 입으로 핵의 몸 부르기",
      "hit": "가운데 입이 닫히고 양쪽 입은 뒤늦게 다문다"
    },
    "tier": 3
  },
  {
    "id": "devourer-split",
    "name": "분열체",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "보스의 잘린 외각 한 조각과 낮게 노출된 핵",
      "walk": "절단면 반대쪽 짧은 다리가 먼저 바닥을 짚는다",
      "attack": "절단면 아래 핵을 낮춰 긁기",
      "skill": "남은 핵 들고 몸 다시 추스르기",
      "hit": "낮은 핵이 껍질 밑으로 말려 든다"
    },
    "tier": 4
  },
  {
    "id": "dim-spore",
    "name": "미광 포자",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "청록 씨방 아래에 뭉친 촛농 모양 발",
      "walk": "씨방이 들리며 바닥 쪽 살이 한 칸씩 따라붙는다",
      "attack": "촛농 몸 부풀려 포자 뱉기",
      "skill": "몸 접어 포자 한 점 모으기",
      "hit": "사격구를 닫고 씨방이 한 번 흔들린다"
    },
    "tier": 1
  },
  {
    "id": "hook-young",
    "name": "갈고리 새끼",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "몸보다 긴 낚싯바늘 꼬리",
      "walk": "꼬리 끝을 땅에 걸고 몸을 끌어당겨 앞발로 받는다",
      "attack": "갈고리 꼬리 아래로 긁기",
      "skill": "갈고리 걸어 몸 끌어당기기",
      "hit": "갈고리가 바닥을 짚어 몸이 구르는 것을 막는다"
    },
    "tier": 1
  },
  {
    "id": "shell-carrier",
    "name": "조개 등짐꾼",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "등에 두 짝의 크기가 다른 조개 방패",
      "walk": "앞발을 들 때 윗조개가 열리고 뒤발을 디딜 때 닫힌다",
      "attack": "아래 조개를 앞으로 돌려 밀기",
      "skill": "윗조개 들어 보호층 내어 주기",
      "hit": "등의 조개 두 장이 차례로 잠긴다"
    },
    "tier": 2
  },
  {
    "id": "echo-worm",
    "name": "메아리 갯지렁이",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "뒤로 말린 두꺼운 마디와 넓은 앞턱",
      "walk": "앞마디를 내리고 뒤마디를 당겨 전진한다",
      "attack": "말린 마디 풀며 턱 깨물기",
      "skill": "몸 마디를 뒤따라 두 번 울리기",
      "hit": "턱에서 꼬리 쪽으로 마디가 순서대로 수축한다"
    },
    "tier": 2
  },
  {
    "id": "mirror-watcher",
    "name": "거울 감시자",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "고개 대신 삐딱한 단면 거울을 단 가는 목",
      "walk": "거울 면을 수평으로 잡은 채 몸통만 낮게 디딘다",
      "attack": "기울인 거울로 빛 되쏘기",
      "skill": "거울 세워 표적의 힘 꺾기",
      "hit": "목 관절이 반동을 받아 거울의 각도가 바뀐다"
    },
    "tier": 3
  },
  {
    "id": "blue-gatekeeper",
    "name": "청람 문지기",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "세 개의 받침다리 위에 걸친 넓은 청회색 쇄골",
      "walk": "앞발 두 개를 고정하고 뒷발로 받쳐 횡갑을 들어 올린다",
      "attack": "세 발을 디뎌 푸른 쇄골 밀기",
      "skill": "세 발 벌리고 횡갑 세우기",
      "hit": "맞은 쪽 받침다리가 굽고 다른 두 다리가 버틴다"
    },
    "tier": 4
  },
  {
    "id": "warped-turret",
    "name": "기형 망루",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "접이식 받침대에 고정된 외눈 포구",
      "walk": "관절 한 쌍씩 옮기고 마지막에 포구가 수평을 찾는다",
      "attack": "관절 고정하고 포구 발사",
      "skill": "포구 들어 첫 일제 사격 조준",
      "hit": "포신이 받침대 방향으로 미끄러진 뒤 되돌아온다"
    },
    "tier": 4
  },
  {
    "id": "split-prophet",
    "name": "갈라진 예언자",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "낮은 관과 높은 관으로 나뉜 갈래 촉수",
      "walk": "낮은 관이 땅을 짚으면 높은 관이 목표를 향해 선다",
      "attack": "상하 촉수 사이로 빛 던지기",
      "skill": "갈라진 관 들어 표적 열 겨누기",
      "hit": "가까운 관이 접히고 뒤의 관이 핵을 가린다"
    },
    "tier": 4
  },
  {
    "id": "void-274",
    "name": "틈새 추적자",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "접은 뒷굽이 머리보다 높은 쐐기 체형",
      "walk": "발목을 차례로 접어 앉았다가 낮게 내달린다",
      "attack": "접힌 뒷다리 펴 돌진",
      "skill": "바닥 짚고 방향 전환",
      "hit": "앞굽으로 멈춰 선 뒤 뒤꿈치를 끌어당긴다"
    },
    "tier": 1
  },
  {
    "id": "void-277",
    "name": "공허 송곳니",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "코 아래 서로 교차하는 두 낫턱",
      "walk": "목을 접어 턱 아래 공간을 만든 뒤 앞발을 바꿔 디딘다",
      "attack": "낫 턱으로 가로 물기",
      "skill": "낫 턱 치켜들어 닫기",
      "hit": "아래턱이 비껴나갔다 경첩을 따라 돌아온다"
    },
    "tier": 2
  },
  {
    "id": "void-280",
    "name": "뒤틀린 창",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "한쪽 팔꿈치에서 세 마디로 접히는 뼈창",
      "walk": "창끝을 접은 채 무릎으로 높이를 바꾸며 접근",
      "attack": "창날 팔 뒤로 빼 전방 찌르기",
      "skill": "창 팔의 마디 솟기",
      "hit": "자루를 당기면 끝마디가 뒤따라 접힌다"
    },
    "tier": 3
  },
  {
    "id": "void-281",
    "name": "먹빛 장막",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "외눈 앞에 두께가 다른 반달 보호판",
      "walk": "눈이 먼저 뜨고 반달이 같은 축에서 천천히 벌어진다",
      "attack": "반달 띠 앞으로 감아 치기",
      "skill": "외눈 둘레에 반달 띠 닫기",
      "hit": "충격 방향의 띠 끝이 먼저 접힌다"
    },
    "tier": 3
  },
  {
    "id": "void-282",
    "name": "균열 거신",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "등뼈가 무너진 돌다리처럼 빈 아치",
      "walk": "먼저 한 발을 눌러 박고 돌 아치를 들어 올린다",
      "attack": "돌 아치 들어 바닥 찍기",
      "skill": "낮은 하체 받치고 돌판 세우기",
      "hit": "아치가 내려앉고 뒤쪽 기둥 다리가 받친다"
    },
    "tier": 4
  },
  {
    "id": "void-284",
    "name": "고난의 성벽",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "세로 눈을 숨기는 두 짝 돌문",
      "walk": "문턱 같은 발을 번갈아 끌며 문짝이 안에서 들썩인다",
      "attack": "돌문 한쪽을 닫아 밀기",
      "skill": "돌문 세우고 안쪽 눈 감추기",
      "hit": "두 문짝이 다른 각도로 닫힌다"
    },
    "tier": 5
  },
  {
    "id": "void-285",
    "name": "황폐 집행자",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "한쪽 어깨 아래에 추처럼 매달린 넓은 칼날",
      "walk": "뒷발로 무게를 받고 손잡이를 등 쪽으로 거둔다",
      "attack": "몸 옆 칼날을 올려베기",
      "skill": "칼날에 마디 벼리기",
      "hit": "날등을 비틀고 손목에서 반동을 받는다"
    },
    "tier": 4
  },
  {
    "id": "void-286",
    "name": "공허 대장군",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "길이가 다른 장창 두 자루를 등에 멘 전열",
      "walk": "두 손을 각 창 밑동에 둔 채 짧고 힘있게 걷는다",
      "attack": "등 장창 당겨 연달아 찌르기",
      "skill": "두 장창 비껴 꽂아 도발",
      "hit": "앞창으로 버티고 뒤창은 어깨 뒤로 기운다"
    },
    "tier": 5
  },
  {
    "id": "void-287",
    "name": "심연 대장군",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "갈비가 빈 가슴을 양쪽 반원관이 감싼 체형",
      "walk": "두 무릎이 펴질 때 어깨관이 가슴 위로 뜬다",
      "attack": "어깨 반원관을 비틀어 가르기",
      "skill": "빈 가슴 바깥에 관을 모으기",
      "hit": "타격 방향의 어깨관이 가슴 쪽으로 돌아온다"
    },
    "tier": 5
  },
  {
    "id": "void-291",
    "name": "실금 알껍질",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "턱을 가리는 알껍질에 크게 어긋난 실금 한 줄",
      "walk": "한 발이 나오며 알이 기울고 다음 발이 몸을 받는다",
      "attack": "금 간 알 한쪽으로 박치기",
      "skill": "금 간 껍질 속에 웅크리기",
      "hit": "실금이 맞물리며 머리가 껍질 안에 들어간다"
    },
    "tier": 1
  },
  {
    "id": "void-293",
    "name": "속빈 미아",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "가슴 가운데 뚫린 깔때기와 움푹 팬 얼굴",
      "walk": "발을 옮기며 흉곽이 열리고 어깨가 따라 올라간다",
      "attack": "빈 흉곽 열어 푸른 숨 불기",
      "skill": "가슴을 접어 서늘한 숨 모으기",
      "hit": "가슴 양옆이 맞물리며 짧게 웅크린다"
    },
    "tier": 1
  },
  {
    "id": "void-294",
    "name": "유리 촉수",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "길이가 다른 세 개의 유리질 손끝",
      "walk": "짧은 촉수로 몸을 지지하고 긴 촉수가 늦게 감긴다",
      "attack": "유리 촉수 셋으로 파편 튕기기",
      "skill": "긴 촉수 끝 교차해 첫 파편 갈기",
      "hit": "맞은 촉수가 먼저 꺾이고 나머지 둘이 받친다"
    },
    "tier": 1
  },
  {
    "id": "void-295",
    "name": "모래 잠복자",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "지면 가까이 드러나는 톱니 등지느러미",
      "walk": "턱을 낮춰 파고들고 등이 물결처럼 뒤따른다",
      "attack": "모래톱 밀고 낮게 덮치기",
      "skill": "모래톱 밑으로 잠겼다 솟기",
      "hit": "앞지느러미를 비스듬히 박아 멈춘다"
    },
    "tier": 2
  },
  {
    "id": "void-298",
    "name": "빈껍질 집전관",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "수직 틈을 둔 뼈빛 집게 껍질 두 장",
      "walk": "두 껍질이 벌어지며 가운데 핵이 조금 늦게 떠오른다",
      "attack": "껍질 사이로 세로 핵편 쏘기",
      "skill": "두 껍질 열어 봉합광 잇기",
      "hit": "깨진 쪽 껍질이 먼저 닫혀 핵을 가린다"
    },
    "tier": 3
  },
  {
    "id": "void-302",
    "name": "검푸른 금식자",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "옆으로 벌어지는 턱 아래 매달린 반투명 낭",
      "walk": "낮은 두 다리가 번갈아 디디며 낭이 아래로 출렁인다",
      "attack": "긴 옆턱 뻗어 사냥감 물기",
      "skill": "턱 거두고 매달린 낭 채우기",
      "hit": "턱이 먼저 잠기고 늘어진 낭이 늦게 흔들린다"
    },
    "tier": 4
  },
  {
    "id": "void-304",
    "name": "먹구름 순례자",
    "states": [
      "idle",
      "walk",
      "attack",
      "skill",
      "hit"
    ],
    "actions": {
      "idle": "등을 덮은 구름송이 형태의 중첩 갑각",
      "walk": "한 발씩 짧게 끌며 등판이 호흡에 맞춰 층층이 들린다",
      "attack": "등 갑각 떨쳐 먹빛 구름 뿜기",
      "skill": "등 갑각 갈라 동료 위에 안개 펴기",
      "hit": "맨 위 등판이 내려와 작은 판들을 순서대로 덮는다"
    },
    "tier": 3
  }
];
