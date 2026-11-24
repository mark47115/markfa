# 1v1 Defense 카드 일러스트

지휘관 15장, 타워 30장, 인컴 60장. 배경을 포함한 88×100 PNG이며 카드당 최대 10색을 사용합니다. 비용과 이름은 게임 UI에서 표시합니다.

지휘관과 타워는 《나 혼자만 레벨업》의 외형과 등장 장면을 바탕으로 새 구도로 그렸습니다. 타워 1장에는 최종 진화체를 넣었습니다. 인컴은 《나 혼자만 레벨업: 라그나로크》의 외신 설정과 본편의 진영·종족을 조합한 게임 창작 유닛입니다. `manifest.json`에 카드별 원작 근거와 창작 모티프, 아트 파일, 색 개수, SHA-256을 기록했습니다. [공식 단행본](https://yenpress.com/series/solo-leveling-comic) · [《라그나로크》 공식 연재](https://tapas.io/series/solo-leveling-ragnarok-novel/info)

별도 모델을 지정하지 않은 기본 OpenAI ImageGen으로 진영과 용도별 아틀라스를 제작했습니다. 프로젝트의 기존 도트 스프라이트를 외형 참고 자료로 사용했습니다. Workspace의 `source/`에 아틀라스 원본, 프롬프트, 카드 내보내기 스크립트가 있습니다.

두 번째 판에서는 인접한 카드의 배경색과 시점을 바꾸고, 캐릭터마다 얼굴·무기·날개·운반 도구 중 하나를 먼저 읽히게 했습니다. 첫 판의 아틀라스도 `source/atlases/`에서 재현할 수 있습니다. [두 번째 판 생성 원본과 프롬프트](source/prompts-v2.md) · [첫 판 프롬프트](source/prompts.md)

카드 105장을 전투 카드 폭 약 68px로 검토했습니다. 현재 적용본은 세 번째 판의 지휘관 14장·타워 29장·인컴 30장과 두 번째 판의 카드 32장으로 구성됩니다. 카미쉬와 백윤호는 두 번째 판 일러스트를 사용합니다. [생성 원본과 프롬프트](source/prompts-v3.md) · [68px 색상·회색 비교](previews/card-comparison.png)

Unity에는 `Tools/import-defense.mjs <Workspace 프로젝트 폴더> --card-art-only`로 가져옵니다. 일러스트는 `Assets/Defense/Resources/Defense/Cards/`에 카드 ID와 같은 이름으로 저장됩니다.
