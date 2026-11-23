"""Enemy silhouettes, action organs and skill cues in source-bounding-box space."""

# Each unit has two authored actions. Units without a combat skill keep a
# character-specific secondary pose for the motion viewer.
# Clip fields: name, pose family, organ x/y (%), reach, rise, VFX shape.
PROFILES = {
    "rift-tick": (
        ("앞다리 튕겨 덮치기", "pounce", 83, 77, 9, 7, "tick"),
        ("다리 접고 낮게 튀기", "pounce", 88, 83, 5, 4, "tick")),
    "void-274": (
        ("접힌 뒷다리 펴 돌진", "pounce", 88, 65, 13, 4, "pounce"),
        ("바닥 짚고 방향 전환", "hook", 81, 85, 7, 6, "pounce")),
    "ruin-shell": (
        ("패인 등판으로 밀기", "ram", 80, 51, 8, 3, "slab"),
        ("등판 세워 도발", "raise", 71, 29, 3, 9, "taunt")),
    "imperfect-hybrid": (
        ("큰 집게 벌려 찍기", "pinch", 83, 49, 9, 6, "pincer"),
        ("봉합 갑각에 기대 집게 내리기", "scythe", 87, 42, 5, 9, "pincer")),
    "void-277": (
        ("낫 턱으로 가로 물기", "bite", 84, 61, 8, 7, "fang"),
        ("낫 턱 치켜들어 닫기", "bite", 92, 49, 6, 10, "fang")),
    "veil-wraith": (
        ("천막 끝 휘감기", "tendril", 85, 66, 7, 5, "veil"),
        ("떠 있는 핵으로 천막 다시 걸기", "gather", 52, 40, 2, 12, "revive")),
    "broken-crown": (
        ("게 집게로 옆을 긁기", "pinch", 88, 65, 7, 4, "pincer"),
        ("세 갈래 관 내보이며 도발", "raise", 58, 18, 3, 8, "taunt")),
    "void-280": (
        ("창날 팔 뒤로 빼 전방 찌르기", "thrust", 89, 56, 15, 3, "spine"),
        ("창 팔의 마디 솟기", "grow", 87, 48, 10, 5, "growth")),
    "void-281": (
        ("반달 띠 앞으로 감아 치기", "tendril", 84, 52, 7, 5, "veil"),
        ("외눈 둘레에 반달 띠 닫기", "curl", 59, 39, 5, 9, "ward")),
    "void-282": (
        ("돌 아치 들어 바닥 찍기", "slam", 77, 82, 5, 12, "fault"),
        ("낮은 하체 받치고 돌판 세우기", "raise", 70, 24, 5, 11, "taunt")),
    "abyssal-choir": (
        ("세 입을 시간차로 벌려 덮치기", "chorus", 83, 52, 7, 6, "echo"),
        ("남은 두 입으로 핵의 몸 부르기", "gather", 49, 36, 4, 13, "revive")),
    "void-284": (
        ("돌문 한쪽을 닫아 밀기", "ram", 86, 62, 7, 5, "slab"),
        ("돌문 세우고 안쪽 눈 감추기", "curl", 57, 46, 4, 7, "ward")),
    "void-285": (
        ("몸 옆 칼날을 올려베기", "scythe", 86, 62, 11, 10, "sickle"),
        ("칼날에 마디 벼리기", "grow", 83, 44, 8, 7, "growth")),
    "void-286": (
        ("등 장창 당겨 연달아 찌르기", "thrust", 89, 36, 13, 3, "spine"),
        ("두 장창 비껴 꽂아 도발", "raise", 72, 23, 6, 9, "taunt")),
    "void-287": (
        ("어깨 반원관을 비틀어 가르기", "scythe", 85, 38, 9, 9, "sickle"),
        ("빈 가슴 바깥에 관을 모으기", "curl", 56, 47, 7, 6, "ward")),
    "the-devourer": (
        ("양쪽 갑각 걷고 가운데 입 닫기", "bite", 72, 58, 10, 13, "maw"),
        ("갑각 두 갈래 벌려 핵 쪼개기", "split", 56, 50, 12, 10, "split")),
    "devourer-split": (
        ("절단면 아래 핵을 낮춰 긁기", "scythe", 81, 66, 8, 6, "rift"),
        ("남은 핵 들고 몸 다시 추스르기", "gather", 52, 42, 2, 7, "rift")),
    "dim-spore": (
        ("촛농 몸 부풀려 포자 뱉기", "puff", 79, 43, 6, 6, "spore"),
        ("몸 접어 포자 한 점 모으기", "curl", 67, 40, 3, 5, "spore")),
    "void-291": (
        ("금 간 알 한쪽으로 박치기", "ram", 82, 57, 7, 4, "shell"),
        ("금 간 껍질 속에 웅크리기", "curl", 58, 43, 3, 10, "guard")),
    "hook-young": (
        ("갈고리 꼬리 아래로 긁기", "hook", 28, 22, 15, 10, "hook"),
        ("갈고리 걸어 몸 끌어당기기", "hook", 34, 22, 19, 12, "approach")),
    "void-293": (
        ("빈 흉곽 열어 푸른 숨 불기", "puff", 72, 60, 6, 5, "breath"),
        ("가슴을 접어 서늘한 숨 모으기", "curl", 70, 60, 4, 8, "slow")),
    "void-294": (
        ("유리 촉수 셋으로 파편 튕기기", "chorus", 88, 39, 10, 6, "glass"),
        ("긴 촉수 끝 교차해 첫 파편 갈기", "grow", 88, 35, 8, 4, "glass")),
    "void-295": (
        ("모래톱 밀고 낮게 덮치기", "pounce", 86, 75, 11, 2, "sand"),
        ("모래톱 밑으로 잠겼다 솟기", "burrow", 81, 80, 11, 7, "approach")),
    "shell-carrier": (
        ("아래 조개를 앞으로 돌려 밀기", "ram", 80, 74, 7, 4, "shell"),
        ("윗조개 들어 보호층 내어 주기", "raise", 52, 24, 4, 10, "ward")),
    "echo-worm": (
        ("말린 마디 풀며 턱 깨물기", "bite", 87, 65, 8, 8, "echo"),
        ("몸 마디를 뒤따라 두 번 울리기", "chorus", 76, 54, 6, 5, "echo")),
    "void-298": (
        ("껍질 사이로 세로 핵편 쏘기", "puff", 61, 55, 5, 5, "seam"),
        ("두 껍질 열어 봉합광 잇기", "split", 57, 48, 6, 7, "mend")),
    "mirror-watcher": (
        ("기울인 거울로 빛 되쏘기", "pivot", 77, 36, 6, 8, "mirror"),
        ("거울 세워 표적의 힘 꺾기", "raise", 71, 34, 4, 6, "weaken")),
    "blue-gatekeeper": (
        ("세 발을 디뎌 푸른 쇄골 밀기", "ram", 84, 44, 6, 6, "gate"),
        ("세 발 벌리고 횡갑 세우기", "raise", 64, 28, 6, 11, "ward")),
    "warped-turret": (
        ("관절 고정하고 포구 발사", "recoil", 92, 47, 7, 5, "cannon"),
        ("포구 들어 첫 일제 사격 조준", "raise", 86, 35, 4, 8, "cannon")),
    "void-302": (
        ("긴 옆턱 뻗어 사냥감 물기", "bite", 91, 65, 12, 8, "fang"),
        ("턱 거두고 매달린 낭 채우기", "gather", 61, 77, 3, 7, "mend")),
    "split-prophet": (
        ("상하 촉수 사이로 빛 던지기", "split", 78, 43, 6, 6, "rift"),
        ("갈라진 관 들어 표적 열 겨누기", "raise", 58, 23, 3, 11, "omen")),
    "void-304": (
        ("등 갑각 떨쳐 먹빛 구름 뿜기", "puff", 76, 47, 6, 5, "cloud"),
        ("등 갑각 갈라 동료 위에 안개 펴기", "split", 57, 32, 9, 8, "ward")),
}
