# PLAN.md — 2026-11-12 작업 계획

> `docs/prd.md`(v0.2)와 `CLAUDE.md`를 기준으로 잡은 이번 세션 실행 계획. 범위가 바뀌면 이 파일을 다시 씀 (누적 문서 아님).

## 현재 위치

Phase 0(목업 프로토타입) 완료 — `docs/slices/01~09` 전부 구현 + MVP_DESIGN 적용, 테스트 44개 통과.
남은 "가짜" 부분:

- `POST /api/routes/generate` — 고정 강남역 코스를 반환하는 목업 (FR-2~4 미구현)
- 갤러리 — 내 localStorage의 공개 코스만 보임 (FR-8 실질 미충족, 서버 저장소 없음)
- AI 여행기 — 결정론적 템플릿 함수 (`buildTravelogue`)

## 오늘의 목표

Phase 1(백엔드 연동) 시작. **목업 생성 API를 실제 파이프라인(지명 추출 → 지오코딩 → 장소 검색)으로 교체**해서, 사용자가 입력한 경로 근처의 실제 장소가 결과 화면에 나오게 한다. 응답 스키마(`{ title, intro, spots[] }`)는 그대로 유지해 프론트는 건드리지 않는다.

## 시작 전 준비 / 결정할 것

- [x] 카카오 REST API 키 → `.env.local` `KAKAO_REST_API_KEY` — 키워드·카테고리 검색 실호출 200 확인
- [x] LLM은 **OpenRouter 무료 모델** 사용 (Claude API는 별도 결제라 제외) → `OPENROUTER_API_KEY` 인증 확인
  - `OPENROUTER_MODEL`은 쉼표로 구분한 폴백 목록: `gemma-4-26b-a4b-it:free` → `nemotron-3.5-super-vl:free` → `ernie-5.5-flash-preview:free` (OpenRouter `models` 파라미터로 자동 폴백)
  - `gemma-4-31b-it:free`는 2026-11-12 테스트 시 업스트림 429(공유 풀 한도)로 제외
  - 모델이 JSON을 ```json 코드펜스로 감싸 반환하는 경우가 있음 → 파싱 시 펜스 제거 필요
  - OpenAI 호환 REST라 SDK 없이 `fetch`로 호출 → 새 라이브러리 설치 불필요
  - 무료 모델은 요청 한도가 낮고 언제든 내려갈 수 있음 → 모델 ID는 환경변수로만 바꾸게 하고, 실패 시 NFR-3 에러/재시도 경로로 처리
- [x] `.env.local` 생성 (값은 비어 있음), `.env*`는 `.gitignore`에 포함 확인

## 오늘 만들 기능 (최대 3개)

### 1. Vercel 배포 — PRD 8장 ✅ (이미 배포돼 있었음)
https://trip-guid.vercel.app — GitHub `main` 연동 자동 배포. 이후 API 키는 Vercel 프로젝트 설정 > Environment Variables에 등록.

**완료조건**
- [x] 배포 URL의 전 페이지 200, 생성 API가 목업 JSON 반환
- [x] `main` push 시 자동 배포 — 최신 Production 배포가 `main` HEAD(`920372b`)와 일치

### 2. 지명 추출 + 지오코딩 — PRD FR-2
입력 텍스트에서 LLM으로 지명 목록을 추출하고, 카카오 지오코딩(키워드/주소 검색)으로 좌표로 변환하는 서버 모듈 (`src/lib/server/` 등). 외부 호출부는 주입 가능하게 만들어 단위 테스트에서 목으로 대체.

**완료조건** ✅ (2026-11-12)
- [x] 경로 입력 시 2개 이상 지명과 좌표가 반환된다 — 응답에 `places[]`(query/name/address/x/y) 추가, 스팟·제목·소개는 아직 목업
- [x] 지명 추출 실패 → 422 `PLACE_NOT_FOUND`, 지오코딩 전부 실패 → 422 `GEOCODE_FAILED`, 입력 길이 위반 → 400 `INVALID_INPUT` → 재입력 안내 + 예시 문구 (feature-spec.md 5장)
- [x] 외부 API 실패 → 502 `UPSTREAM_ERROR` → 에러 + 재시도 버튼 (NFR-3)

**구현 메모**
- 구조: `src/lib/server/{llm,kakao,extractPlaceNames,resolveRoutePlaces}.ts` → `api/routes/generate/handler.ts`(의존성 주입, 테스트 대상) → `route.ts`(env 연결)
- OpenRouter 호출에 `reasoning: {enabled: false}` — 추론형 폴백 모델이 토큰을 다 써서 content가 null이 되는 문제 방지
- 행정구역명(…동/…구)은 카카오 주소 검색 먼저 — 키워드 검색이 엉뚱한 길 이름을 반환함
- 오타 교정은 LLM에 맡기지 않음 (임의 지명으로 바꾸는 환각 확인됨)
- 알려진 한계: 지명별로 독립 지오코딩이라 동명이소 구분은 LLM 구체화 프롬프트에 의존 (FR-3에서 경로 근접도 보정 검토)

### 3. 주변 장소 큐레이션 — PRD FR-3
좌표 주변을 카카오 로컬 API(카테고리 검색)로 조회하고, 카테고리가 겹치지 않게 등급별 개수(무료 3 / 프리미엄 5)만큼 선택. 부족하면 반경을 넓혀 재검색. 이 단계에서 제목/소개/스팟 설명은 임시 템플릿으로 채운다 (FR-4는 다음 세션).

**완료조건**
- 생성 결과의 스팟이 입력 경로 근처 실제 장소(이름·카테고리·주소)로 채워진다
- 무료 3개 / 프리미엄 5개가 정확히 반환되고, 카테고리가 가능한 한 중복되지 않는다
- 선택 로직(다양성·반경 확대)은 외부 호출 없이 단위 테스트로 검증된다

## 오늘 안 만들 기능 (다음 세션 이후)

- FR-4 AI 제목/소개/스팟 설명 생성 — 다음 세션 1순위
- 응답 캐싱 (NFR-5)
- 갤러리 서버 저장소 이전 (FR-8) — 저장소(Vercel Postgres/KV, Supabase 등) 선택 필요
- anonymousId 유실 안내 문구 (NFR-6)
- AI 여행기 실제 LLM 연동, 체크인 사진 영속화 (P2)
