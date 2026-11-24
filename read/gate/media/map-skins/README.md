# 전장 스킨과 광산

새 배경 18장은 모델 ID를 별도로 지정하지 않고 기본 OpenAI ImageGen으로 제작했습니다. 환승역 상대 전장은 제공된 구도 이미지를 OpenAI 이미지 생성 API로 편집했습니다. 설원의 전장 두 시점에는 기존 승인 배경을 사용합니다. 광산과 세부 재질은 작품의 장소를 바탕으로 한 게임용 재구성입니다.

[전장·광산 미리보기](../../mobile-match-layout.html#map-skin-preview)

## 현재 전장 · 설원 도트 스타일

레드 게이트의 큰 도트, 어두운 바닥과 좁은 가장자리 장식을 기준으로 나머지 전장 6종을 다시 그렸습니다. 중앙에는 타일 격자나 큰 장식을 두지 않고 스킨별 게이트 색과 대표 소품만 남겼습니다. 설원은 붉은 석문을 보존하고, 게이트 높이를 다른 전장과 맞춘 뒤 하단 전투 바닥을 화면 끝까지 늘렸습니다.

전장 전체는 941×2682이며, 내 전장과 상대 전장 배경은 같은 원화에서 잘라 씁니다. 전환 거리와 배치·유닛 좌표는 그대로입니다.

| 전장 | 전체 맵 PNG | 미리보기 |
| --- | --- | --- |
| 폐쇄된 환승역 | [PNG](pixel-v2/subway-joined.png) | [환승역](../../mobile-match-layout.html?skin=subway#map-skin-preview) |
| 레드 게이트 · 설원 | [PNG](pixel-v2/red-gate-joined.png) | [설원](../../mobile-match-layout.html?skin=red-gate#map-skin-preview) |
| 미술관 균열 | [PNG](pixel-v2/museum-joined.png) | [미술관](../../mobile-match-layout.html?skin=museum#map-skin-preview) |
| 카르테논 신전 | [PNG](pixel-v2/cartenon-joined.png) | [신전](../../mobile-match-layout.html?skin=cartenon#map-skin-preview) |
| 악마성 · 잿빛 거리 | [PNG](pixel-v2/demon-castle-joined.png) | [악마성](../../mobile-match-layout.html?skin=demon-castle#map-skin-preview) |
| 제주 · 개미굴 | [PNG](pixel-v2/jeju-hive-joined.png) | [개미굴](../../mobile-match-layout.html?skin=jeju-hive#map-skin-preview) |
| 전직 던전 · 붉은 기사 회랑 | [PNG](pixel-v2/red-knight-joined.png) | [기사 회랑](../../mobile-match-layout.html?skin=red-knight#map-skin-preview) |

[7종 한눈에 보기](pixel-v2/overview.png) · [공통 생성 프롬프트](pixel-v2/prompt.txt) · [스킨별 지시](pixel-v2/themes.json) · [전장 출력 스크립트](pixel-v2/compose.py)

설원은 상단 양옆 안전선을 게이트 아래쪽 시작 위치에 맞췄습니다. 눈 덮인 문턱에 가려진 부분은 그대로 두었으며, 게이트와 하단 배치 구역은 변경하지 않았습니다.

### 광산 7종

광산도 전장과 같은 도트 스타일로 단순화했습니다. 입구는 상단에, 광맥 네 곳은 양쪽 가장자리에 두고 중앙 통로를 비웠습니다. 광맥 높이만 기존 광부 발 위치에 맞췄으며 광부·버튼 좌표와 생산량은 바꾸지 않았습니다.

[광산 7종 한눈에 보기](pixel-v2/mines-overview.png) · [내 광산 레이아웃](pixel-v2/subway-own-mine-layout.png) · [상대 광산 레이아웃](pixel-v2/subway-opponent-mine-layout.png) · [생성 프롬프트](pixel-v2/mine-prompt.txt) · [스킨별 지시](pixel-v2/mine-themes.json) · [출력 스크립트](pixel-v2/compose-mines.py)

### 배치 공간 확인

전장 미리보기는 기존 배치·유닛 좌표와 화면 규격을 사용합니다. 다만 배치 규칙과 별개로, 새 그림은 노란 안전선을 거의 수직으로 바꿨기 때문에 위쪽은 넓어지고 아래쪽은 일부 더 좁아 보입니다. 내 전장 941px 화면에서 안전선 안쪽 폭을 같은 높이로 비교했습니다.

| 높이 | 기존 배경 7종 | 도트 배경 7종 |
| --- | ---: | ---: |
| 출현선 높이 (`y=576`) | 657–791px | 747–796px |
| 아군 예시 대열 높이 (`y≈1000`) | 819–831px | 747–824px |
| 하단 HUD 시작 높이 (`y=1236`) | 847–925px | 747–841px |

아군 대열 높이에서 가시 폭이 가장 많이 줄어든 곳은 붉은 기사 회랑입니다(약 829px → 747px). 내·상대 전장의 예시 유닛 발 위치는 7종 모두 안전선 안에 있고, 가장 가까운 예시도 안전선에서 약 178px 떨어져 있습니다. 안전선 폭은 그림의 가시 폭이며, 게임 엔진의 실제 배치 판정 범위를 측정한 값은 아닙니다.

## 이전 전장과 광산

아래는 도트 스타일 개편 전 배경입니다. 환승역의 이전 전환 지도는 양쪽 통로가 한 문턱을 공유하도록 만든 [게이트 원화](subway-threshold.png)를 사용했습니다. [이전 환승역 전체 지형](subway-joined.png) · [이전 합성 소스](compose-fields.py)

| 스킨 | 배경 PNG | 원작 설정과 재구성 |
| --- | --- | --- |
| 폐쇄된 환승역 | [내 전장](subway-own.png) · [상대 전장](subway-opponent.png) · [광산](subway-mine.png) | 기본 제공 스킨입니다. 상대 시점의 벽 매립형 보라색 게이트를 기준으로 내 시점의 구조를 맞췄습니다. 내 전장에는 왼쪽 열차, 오른쪽 빨간 배관과 전기함이 보입니다. 광산은 정비동의 철로와 청록 광맥으로 꾸몄습니다. |
| 레드 게이트 · 설원 | [내 전장](../ingame-reference/red-gate-straight-lane.png) · [상대 전장](../ingame-reference/red-gate-opponent-portrait.png) · [광산](red-gate-mine.png) | 원작의 레드 게이트와 눈 덮인 숲을 가져왔습니다. 광산은 얼음이 덮인 지지대와 푸른 빙정 광맥을 사용합니다. [본편 웹툰 4권](https://yenpress.com/titles/9781975337247-solo-leveling-vol-4-comic) |
| 라그나로크 · 미술관 균열 | [내 전장](museum-lower.png) · [상대 전장](museum-opponent.png) · [광산](museum-mine.png) | 《라그나로크》 1화의 전시실과 창고 벽에 열린 검은 게이트를 가져왔습니다. 전시실 액자와 푸른 균열, 지하의 청록 광맥을 연결했습니다. [라그나로크 웹소설 1화](https://tapas.io/episode/3030131) |
| 카르테논 신전 | [내 전장](cartenon-own.png) · [상대 전장](cartenon-opponent.png) · [광산](cartenon-mine.png) | 원작의 이중 던전 신전을 석상 부조와 푸른 횃불로 재구성했습니다. 광산의 청람빛 광맥은 돌기둥 사이에 놓았습니다. [애니메이션 공식 9화](https://sololeveling-anime.net/1st/story/?id=09) |
| 악마성 · 잿빛 거리 | [내 전장](demon-castle-own.png) · [상대 전장](demon-castle-opponent.png) · [광산](demon-castle-mine.png) | 성진우가 오르는 악마성을 그을린 거리와 아치로 구성했습니다. 현무암 광산에는 구릿빛 광맥을 배치했습니다. [본편 웹툰 6권](https://yenpress.com/titles/9798400900273-solo-leveling-vol-6-comic) |
| 제주 · 개미굴 | [내 전장](jeju-hive-own.png) · [상대 전장](jeju-hive-opponent.png) · [광산](jeju-hive-mine.png) | 여왕개미를 찾아 들어간 제주도 레이드의 서식지를 현무암 굴로 재구성했습니다. 호박빛 층리와 광맥이 전장과 광산을 잇습니다. [본편 웹툰 7권](https://yenpress.com/titles/9798400900488-solo-leveling-vol-7-comic) |
| 전직 던전 · 붉은 기사 회랑 | [내 전장](red-knight-own.png) · [상대 전장](red-knight-opponent.png) · [광산](red-knight-mine.png) | 전직 퀘스트에서 기사와 겨루는 던전을 철제 기둥과 자주색 깃발로 표현했습니다. 성채 지하에는 석류석 광맥을 넣었습니다. [공식 공개 11화](https://www.crunchyroll.com/watch/GD9UV37Z0/a-knight-who-defends-an-empty-throne) |

## 화면 규격

- 합성 화면은 941×1672입니다. 전장 배경과 광산 배경은 HUD·격자·유닛과 분리해 저장했습니다.
- 위에 게이트가 있는 내 시점과 아래에 게이트가 있는 상대 시점에 같은 벽 구조와 바닥 재질을 쓰고, 지휘관·유닛 위치와 HUD는 공용 좌표로 합성합니다.
- 광산은 좌우 벽에 두 광맥씩 둡니다. 채굴 스프라이트와 배치 비용, 마력석 생산량은 공용 값을 사용합니다.

## 미술관 하단 연결 수정

[연결된 전체 맵](museum-joined.png) · [교체용 하단 맵](museum-lower.png) · [전투 미리보기](../../mobile-match-layout.html?skin=museum#map-skin-preview)

상단과 게이트는 원본을 유지했습니다. 하단은 OpenAI ImageGen으로 다시 그리고, 게이트 기둥 아래에서 노란 안전선이 시작하도록 위치와 기울기를 보정했습니다. 바닥에 겹치던 타일 줄눈과 양옆 벽이 갑자기 드러나던 가로 경계를 정리했습니다.

[이전 하단 원화](museum-own.png) · [ImageGen 편집본](museum-lower-imagegen.png) · [편집 프롬프트](museum-lower-prompt.txt) · [합성 소스](compose-fields.py)

## 생성 프롬프트

환승역 내 시점은 승인된 상대 시점과 이전 내 시점 이미지를 함께 참조했습니다. 신규 스킨 내 시점은 수정한 환승역 내 시점을, 상대 시점은 같은 스킨의 내 시점과 승인된 환승역 상대 시점을 참조했습니다. 광산은 기존 광산의 광맥 위치를 기준으로 각 테마 재질을 적용했습니다.

### 환승역 내 전장

```text
Use case: stylized-concept. Produce the release 2D pixel-art environment plate in portrait 9:16 for a Korean mobile 1v1 defense game. The first input is the accepted reverse view and is the primary source of the physical architecture, bevel details, texture, color and high 55–65 degree camera elevation. The second is the older near-player direction and indicates the destination composition, not the geometry or style source. Draw a FRESH view of the SAME world seen by the player standing at the OTHER end, looking down and forward along the exact same long rectangular battle corridor at the purple spawn portal now at the TOP far end. Portal MUST sit RECESSED in the wall at the top, low base lip seamlessly integrated with purple-trimmed grey stone jambs and two amber rectangular cap lights. The former foreground gate wall appears shorter with depth at the far end. Violet-striped subway car is on the LEFT with its long inward flank and slanting roof visible; red utility pipes and electrical junction boxes on the RIGHT, projecting forward with top and near facing faces. Believable top faces and trapezoidal tile foreshortening. Charcoal indigo tiles, straight parallel physical mustard safety stripes, amber fixtures, violet pinstripes and deep charcoal beveled structures exactly like reverse reference. Normalize width so open flat unobstructed combat tiles fill middle 75-82% screen width from 23% to 84% of image height. Two straight edge stripes converge upward gently with consistent straight tile seams and same vanishing point, NO kinks. Fixed PORTRAIT crop, vertical frame. Small material marks, bright pixels confined to edges. Bottom 21% is uninterrupted dim tiled floor for overlays, extends all the way to edge without any foreground wall or horizontal barrier. Large visible classic pixel clusters (work as if 470×836 original with nearest-neighbor pixel edges), consistent chunky art and limited palette. Crisp grid-free game-ready plate of only environment, no HUD/UI, no characters, no words, no frame or watermark.
```

### 내 전장 공통 지시

```text
Use case: stylized-concept. Create ONE finished full-bleed 9:16 portrait pixel-art environment plate for a Korean mobile tower-defense map skin. The provided accepted arena is the absolute geometry and pixel style template: same high three-quarter top-down camera (55–65 degree depression), expansive empty battle floor, precise straight central rectangular world lane projected as a subtle trapezoid. One access portal at the upper center, recessed in the far wall and at most 15% of image width. Side edges and material seams run in straight lines to the same vanishing point, opening toward bottom; no perspective kinks or shifts. Lane clear width >= 75% of frame at center, broad plain visible floor through the bottom for a HUD. Edge props only, hugging the far and side walls, no near wall or cross-lane barrier. High-quality handcrafted chunky pixel-art clusters and hard stepped edges like the reference, moody controlled value range, limited palette, bold silhouette, moderate contrast on edges, broad matte darker mid-value low-frequency floor that colorful unit sprites will read on. Preserve all framing and clearances within a few percent of the input. Keep geometry theme-specific and physically believable. No characters, no text, HUD, icons, grid overlay, framing, blur, watermarks, borders, camera labels, minimap or overlay atmospherics. Theme and original asset direction:
```

### 상대 전장 공통 지시

```text
Use case: stylized-concept. Produce ONE fresh finished 9:16 portrait 2D game background drawing of the SAME entirely physical arena in image one, looking FROM ITS OPPOSITE END, accompanied by image two which demonstrates the established high-angle reverse camera framing in a different skin. Take all materials, gate identity, portal hue, atmosphere and object types from the FIRST theme image only. The spawn portal now appears near the BOTTOM at x~50%, y~78–83%, recessed in an architecturally appropriate short low foreground gate (max 15% frame height; gate sill can cross lower edge but never covers central playable floor); show its top and inward-facing near structure as seen from behind. The TOP is a distant open commander location before the shallow far wall, with NO portal. Physically reverse which side specific landmark details appear on, paint new correctly upright pixels, natural consistent depth convergence toward TOP as template two, no kinks in the edge guides or floor. Match the first image's stylized chunky pixel clusters, material bevels, crisp pixel edges, scale, contrast and restrained illumination. The continuous central playfield has clear width >=75% at its midpoint and is completely empty from y~14% to ~75%, with no giant creatures, people, statues, text or debris on the floor. Bottom 15% fades into a quiet floor-height foreground apron able to back low HUD overlays. One clear portal only at the near end, keep upper commander end open. No characters, UI, panels, words, signs, high saturation glow in combat floor, frame, labels, gradients covering the scene or realism. Theme for cross check:
```

### 광산 공통 지시

```text
Use case: precise-object-edit. Create a finished background for the MINE view of a portrait mobile pixel-art defense game. The provided mine environment specifies exact footprint and camera, keep four wall ore sites and empty clear center of the existing black floor. 3:4 vertical full bleed image, 55–65 degree high three-quarter down view. Critical ore sites exactly two on each side, centered near (9%,32%), (91%,32%), (9%,64%), (91%,64%), glowing moderately and inset into the outermost 15% of floor width. Keep obvious clear standing space on their inward sides for miners, entire center walkable through bottom. Rebuild ceiling/entrance props within top 20%, match the established theme's materials, drop modest lighting onto floor near walls only, no props across middle or lower corner UI. Keep thick pixel clusters, crisp pixel edges, rich sculpted but intentionally low contrast dark flat floor. No HUD, words, sprites, units, weapons, menu, borders, extra deposits or panels. Environment art only. Theme:
```

### 배경별 지시

각 이미지의 생성 지시는 위 공통 지시와 다음 배경별 지시를 이어 사용했습니다.

#### subway-mine.png

공통 지시 **광산**

```text
The lower maintenance workings directly below a closed Korean subway transfer station. Replace timber with chunky dark slate mechanical beams, violet trim, orange rectangular lamps, red utility pipes, grey control box and a short pair of service rails entering the top tunnel. Keep walls charcoal, four restrained cyan-teal triangular crystal veins embedded into seams in the wall at exact sites. Cohesive with provided second image.
```

#### red-gate-mine.png

공통 지시 **광산**

```text
an excavation tunnel in permafrost under the Red Gate snowy forest. Cool blue ice and dark slate side walls, frost-laden beam braces, cold cerulean ice formations; four light blue ice-crystal mineral clusters at the exact stated sites; a hint of scarlet reflected light at the upper tunnel only. Matte graphite-blue frosted floor kept flat.
```

#### museum-own.png

공통 지시 **내 전장**

```text
abandoned Korean university art exhibition and its storage room, damaged modern gallery architecture; dark desaturated petroleum-teal slate floor, graphite concrete walls, framed paintings and cold spotlights fixed high on both side walls, empty crates along edges; deep charcoal wall-mounted rift with cyan-blue mist around the rim only (not a luminous spell across the arena)
```

#### museum-opponent.png

공통 지시 **상대 전장**

```text
abandoned Korean university art exhibition and its storage room, damaged modern gallery architecture; dark desaturated petroleum-teal slate floor, graphite concrete walls, framed paintings and cold spotlights fixed high on both side walls, empty crates along edges; deep charcoal portal at the BOTTOM near end with cyan-blue mist around the rim only (not a luminous spell across the arena)
```

#### museum-mine.png

공통 지시 **광산**

```text
a hidden museum service excavation, fractured dark concrete, oxidized teal steel beams, gallery crates and cold blue fixtures; tight turquoise shard veins rising out of broken concrete. Carry forward the materials and palette of the second image, and honor the exact first image wall-site anchors.
```

#### cartenon-own.png

공통 지시 **내 전장**

```text
massive Cartenon double-dungeon stone temple, dark desaturated blue-gray cut limestone floor, heavy column bases along edges and chipped monumental stone reliefs built into side buttresses, giant serene stone face in far-wall lintel, pale blue torches, centered cool-white circular rift seated in the far relief wall; no freestanding statue or person
```

#### cartenon-opponent.png

공통 지시 **상대 전장**

```text
massive Cartenon double-dungeon stone temple, dark desaturated blue-gray cut limestone floor, heavy column bases along edges and chipped monumental stone reliefs built into side buttresses, giant serene stone face in far-wall lintel, pale blue torches, centered cool-white circular portal at the BOTTOM near end; no freestanding statue or person
```

#### cartenon-mine.png

공통 지시 **광산**

```text
a temple crypt excavation in blue-gray slate; squared pillars, etched rock faces and four frosty pale-lapis ore seams, candles and thin cold azure rim light confined to margins. Carry forward the materials and palette of the second image, and honor the exact first image wall-site anchors.
```

#### demon-castle-own.png

공통 지시 **내 전장**

```text
charred medieval street inside the Demon Castle dungeon, soot-muted warm plum and iron paved straight lane, weathered ruined arches and cracked crenellated walls with ember pits only behind side parapets, copper embers embedded in wall, molten-orange ring confined to far basalt arch
```

#### demon-castle-opponent.png

공통 지시 **상대 전장**

```text
charred medieval street inside the Demon Castle dungeon, soot-muted warm plum and iron paved straight lane, weathered ruined arches and cracked crenellated walls with ember pits only behind side parapets, copper embers embedded in wall, molten-orange ring portal at the BOTTOM near end
```

#### demon-castle-mine.png

공통 지시 **광산**

```text
an underground basalt forge and excavation, scorched block walls, iron scaffolding, isolated copper ember braziers and four sharp orange/copper ore clusters; no lava over ground or luminous veins in the central floor. Carry forward the materials and palette of the second image, and honor the exact first image wall-site anchors.
```

#### jeju-hive-own.png

공통 지시 **내 전장**

```text
Jeju volcanic basalt ant-tunnel, dark low-saturation umber-charcoal hex-broken basalt floor, black rock and ridged chitin-like strata on the periphery, amber honey-resin cells or small ochre nodules embedded in the edges, yellow-amber rift set directly in far basalt wall; no creatures eggs or gore on the central path
```

#### jeju-hive-opponent.png

공통 지시 **상대 전장**

```text
Jeju volcanic basalt ant-tunnel, dark low-saturation umber-charcoal hex-broken basalt floor, black rock and ridged chitin-like strata on the periphery, amber honey-resin cells or small ochre nodules embedded in the edges, yellow-amber rift portal at the BOTTOM near end; no creatures eggs or gore on the central path
```

#### jeju-hive-mine.png

공통 지시 **광산**

```text
a volcanic basalt hollow in Jeju, ridged dark vesicular rock and amber resin accents, four ochre honey-amber mineral deposits shaped like faceted chips, simple wooden supply crates only upstage. Carry forward the materials and palette of the second image, and honor the exact first image wall-site anchors.
```

#### red-knight-own.png

공통 지시 **내 전장**

```text
old stone hall of the red knight and the class-change quest, cool dark purple slate slabs, iron columns, deep burgundy pennants pinned high against BOTH side walls and short sconces with garnet highlights, a restrained deep scarlet portal in a far ribbed stone arch, faint silver heraldic relief on the far lintel; empty castle passage with no throne or standing armored character
```

#### red-knight-opponent.png

공통 지시 **상대 전장**

```text
old stone hall of the red knight and the class-change quest, cool dark purple slate slabs, iron columns, deep burgundy pennants pinned high against BOTH side walls and short sconces with garnet highlights, a restrained deep scarlet portal portal at the BOTTOM near end, faint silver heraldic relief on the far lintel; empty castle passage with no throne or standing armored character
```

#### red-knight-mine.png

공통 지시 **광산**

```text
a fortified undercroft below an iron-and-velvet castle, dark plum-black stone, iron braces and deep wine pennants at the back only, four angular garnet ore clusters with tiny rosy reflections on the wall. Carry forward the materials and palette of the second image, and honor the exact first image wall-site anchors.
```
