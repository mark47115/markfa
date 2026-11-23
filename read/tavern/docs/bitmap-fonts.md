# 게임 이미지 폰트

선술집의 양피지색 글자와 호박빛 등불, 짙은 갈색 도트 외곽선을 글꼴에도 썼다. 본문용과 연출용의 자형이 같아 기물 설명에서 전투로 넘어가도 글꼴이 한 계열로 보인다.

- **Cavern Text**는 12px 본문용이다. 단색 양피지색 획과 넓은 줄 간격을 사용한다. 한글 완성형 11,172자를 포함해 기물명·대사·설명에 쓸 수 있다.
- **Cavern Impact**는 24px 연출용이다. 같은 획을 두 배 크기로 잡고 금속성 하이라이트, 구리색 아랫면, 도트 외곽선과 그림자를 더했다. 데미지·회복 수치에는 고정 폭 숫자를 쓰고, 치명타·회피·보호막 같은 전투 문구에 쓰는 한글을 포함한다.

[PC 미리보기](../media/fonts/v1/preview.png) · [모바일 미리보기](../media/fonts/v1/preview-mobile.png) · [이미지 폰트 ZIP](../media/fonts/v1/cavern-bitmap-fonts.zip)

## 파일과 확인 범위

각 폰트는 BMFont `.fnt`와 투명 PNG 아틀라스를 함께 사용한다. [사용 규격](../media/fonts/v1/README.md) · [글자 범위와 팔레트](../media/fonts/v1/manifest.json)

브라우저 게임 UI는 Cavern Text의 PNG 아틀라스에서 만든 WOFF2를 사용한다. 12px 비트맵과 같은 픽셀 자형의 윤곽, 글자 폭을 함께 담아 버튼 색상, 자동 줄바꿈, 키보드 조작을 유지한다. 새 게임 UI도 공통 CSS의 `--game-ui-font`를 사용한다. 타이틀 워드마크는 Cavern Impact로 렌더링한 기존 PNG를 쓴다. [공통 글꼴 CSS](../game-font.css) · [웹 이미지 폰트](../media/fonts/v1/text/cavern-text.woff2) · [웹 글꼴 생성 코드](../qa/build-web-bitmap-font.py)

웹 글꼴은 저장소 루트에서 아래 명령으로 다시 생성할 수 있다.

```powershell
uv run --no-project --python 3.12 --with 'fonttools[woff]' --with pillow python workspace/2026-11-19_cavern-heros-25169da3/qa/build-web-bitmap-font.py
```

실제 파일의 글리프 좌표·투명도·숫자 폭·한글 범위를 검산했다. 980px과 390px에서 선술집 화면과 전투 도식 위에 표시해 읽히는지 확인했다. 이 화면은 Workspace의 디자인 미리보기다.

자형의 출발점은 OFL 1.1 물마루 v1.0이다. Cavern Heros용 색과 연출 레이어를 더한 아틀라스는 워크스페이스의 [폰트 생성 코드](../qa/build-bitmap-fonts.mjs)로 다시 만들 수 있다. [원본 릴리스](https://github.com/mushsooni/mulmaru/releases/tag/v1.0)
