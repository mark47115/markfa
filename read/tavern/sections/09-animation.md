# 아군·적군 유닛 애니메이션

v10은 공허군 32종의 공격과 스킬 자세 64개를 교체했다. 공격 기관에 맞춰 움직이는 부분과 중심점을 지정했다. 삼키는 자는 윗턱과 아래턱을 벌렸다 닫고, 기형 망루는 포구를 받친 다리를 고정한 뒤 반동을 받는다. 실금 알껍질은 피격 경감 시 갑각 안으로 웅크리고, 빈껍질 집전관은 회복 때 중앙 이음새를 벌린다. [양 진영 재생](../ally-animation.html) · [308종 PNG와 매니페스트 ZIP](../media/unit-sprites/unit-motion-v10/tavern-heros-unit-motion-v10.zip)

[공허군 대표 6종의 준비·접촉 자세와 작용점](../media/unit-sprites/unit-motion-v10/review/void-action-contact.png)

장비·체형 42개 유형에 60가지 동작을 적용했다. 준비, 작용과 회수가 도구에 따라 달라진다. 북채는 북면, 집게는 물리는 위치, 붓은 붓끝을 작용점으로 쓴다. 석궁은 시위를 당겨 걸고 장전한 뒤 발사하며, 활은 화살이 떠나는 순간 시위가 돌아온다. `markerPixel`은 Unity에서 스프라이트 기준점을 기준으로 읽는 작용점이다. [v8 무기·도구 조사 시안](../media/unit-sprites/unit-motion-v8/review/equipment-cycle.gif) · [v8 장비 유형 1](../media/unit-sprites/unit-motion-v8/review/equipment-1.png) · [v8 장비 유형 2](../media/unit-sprites/unit-motion-v8/review/equipment-2.png) · [v8 장비 유형 3](../media/unit-sprites/unit-motion-v8/review/equipment-3.png) · [조사 출처와 적용](../docs/animation-production-standards.md)

시트는 88×88 셀 10열×7행이다. 1~4행은 대기, 이동, 기본 공격, 피격이고 5~6행은 무기별 추가 동작이다. 7행에는 스킬 자세가 들어간다. 적 스프라이트는 전투에서 이동 및 조준 방향에 따라 뒤집으며 발 중심은 `[44, 74]` 전후다. 각 적의 새 타격·발사·시전점은 해당 프레임의 불투명 픽셀에 놓인다. [동작 64개 원본](../qa/void_motion_profiles.py) · [프레임 생성 소스](../qa/build-void-motion.py) · [시트 매니페스트](../media/unit-sprites/unit-motion-v10/manifest.json) · [픽셀과 프레임 검사](../media/unit-sprites/unit-motion-v10/qa.json)

전수 검사는 PNG 크기, 원본 팔레트, 투명도, 셀 경계와 몸체 연결을 확인한다. 대기 1,232프레임에서 머리 도트가 동일한 가로 위치를 유지하고 지상 유닛 발이 제자리에 붙어 있는지 비교했다. 발사 클립 97개의 작용점을 해당 도트와 대조하고, 석궁 동작 40개에서 시위를 당기는 손과 총몸의 이동량을 확인했다. [석궁 v7 확대 비교](../media/unit-sprites/unit-motion-v7/review/crossbow-poses.png)

## v9 공격·스킬 실루엣 검사

308종의 공격·스킬 678개를 점검했다. 가지 경비는 방패가 하나 더 생겼고, 못박이는 기존 충격부 위에 새 부품이 나왔다. 정찰궁수·조립형 로봇·솔개 파수꾼·삼키는 자의 새 도구, 팔, 날개 또는 돌출부도 기존 조각을 움직이는 방식으로 바꿨다. [대표 16종 전후 비교 1](../media/unit-sprites/unit-motion-v9/review/ownership-1.png) · [전후 비교 2](../media/unit-sprites/unit-motion-v9/review/ownership-2.png) · [공격 전후 반복 재생](../media/unit-sprites/unit-motion-v9/review/ownership-cycle.gif)

597개 클립은 원본의 팔·집게·날개·장비 조각을 분리해 자세를 움직인다. 경계가 가려진 81개는 원래 몸과 장비가 붙은 상태에서 자세를 바꾼다. 매니페스트의 `sourcePartFrames`에 해당 클립에서 분리된 원본 조각을 쓴 프레임 수를 기록했다.

## v4 장비별 자세 참고

v4에서 아군 276종의 공격·지원 동작 338개를 장비 사용 방식에 맞춰 제작했다. 219종의 손잡이와 타격면·출구 좌표를 지정했으며, v5에서도 해당 좌표와 전투 이벤트 순서를 활용한다. [v4 시트 ZIP](../media/unit-sprites/ally-motion-v4/tavern-heros-ally-motion-v4.zip) · [사용자 제작 기준](../docs/animation-production-standards.md)

| 줄 | 동작 | 프레임 | 길이 |
| --- | --- | ---: | ---: |
| 1 | 대기 반복 | 4 | 700ms |
| 2 | 이동 반복 | 8 | 640ms |
| 3 | 기본 공격 또는 지원 | 10 | 715ms |
| 4 | 피격 | 4 | 310ms |
| 5–6 | 무기별 추가 공격 | 동작당 10 | 715ms |

원본 도트의 크기와 RGB 팔레트를 보존했다. 오른쪽 방향 88×88 셀 10열×6행이며, 원점에서 [44, 74]가 발 기준점이다. 이전 검토에서 발 중심이 밀렸던 유닛은 발이 닿는 쪽을 중심에 맞췄고, 가죽 정비공의 피격은 장비를 분리하지 않고 체중을 되돌리는 프레임으로 바꿨다. 솔개 파수꾼에는 날개 쪽 움직임을, 순록 새끼에는 앞·뒷다리 교대를 적용했다. [이전 검토 사례](../docs/ally-style-review.md)

| 장비 | 10프레임에서 읽히는 행동 |
| --- | --- |
| 북·징 | 북채를 들어 올린 뒤 타격면에 내린다. 전방 음파는 한 박자, 아군 강화는 반동을 끼운 두 박자다. |
| 활 | 보조 손이 시위를 당기는 동안 다른 손으로 활을 받친다. 시위를 놓을 때 당기던 손이 뒤로 움직인다. |
| 석궁 | 시위를 걸어 당기고 화살을 얹은 뒤 조준한다. 발사하면서 시위가 앞으로 풀린다. |
| 총·포신 | 두 손으로 받쳐 조준하고 격발 후 손과 총구가 짧게 밀린다. |
| 투창·투척물 | 뒷발로 버티며 물체를 뒤로 젖히고 앞발을 디디면서 놓는다. 놓은 뒤에는 손에서 투척물을 제거한다. |
| 검·도끼·방패 | 검끝과 앞발로 베기와 찌르기를 구분한다. 긴 도끼는 두 손으로 휘두르며 방패는 몸을 실어 밀친다. |
| 나팔·깃발·보급 | 나팔은 입까지 옮기고, 깃발은 들어 올린다. 보급은 팔을 뻗어 전달하고 팔꿈치를 접으며 돌아온다. |

아군별 장비와 직접 지정한 좌표, 장비 유형별 자세는 제작 코드에 있다. [좌표와 장비 목록](../qa/ally-motion-v4-guide.mjs) · [자세 제작 코드](../qa/ally-motion-articulation.mjs) · [대표 동작 프레임](../media/unit-sprites/ally-motion-v4/review/weapon-poses.png)

첫 접촉·발사·시전은 여섯째 프레임 시작인 **350ms**에 표시한다. 북과 징의 두 번째 강화 박자는 여덟째 프레임 시작인 **465ms**에 표시한다. 매니페스트는 프레임별 손 위치와 작용점을 `hand`, `tip`에 기록한다. [프레임 매니페스트](../media/unit-sprites/ally-motion-v4/manifest.json) · [시트 빌드 코드](../qa/build-ally-motion-v2.mjs)

검수 범위는 브라우저의 실제 크기·확대·밀집 교전이다. 피해와 강화는 전투 코드의 기존 규칙을 따른다. [이펙트 규격](10-vfx.md) · [이전 장비 검수판 ZIP](../media/unit-sprites/ally-motion-v3/tavern-heros-ally-motion-v3.zip) · [기존 64×64 시트 ZIP](../media/unit-sprites/ally-motion-v1/tavern-heros-ally-motion.zip)
