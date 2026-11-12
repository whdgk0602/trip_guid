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

**완료조건** ✅ (2026-11-13)
- [x] 생성 결과의 스팟이 입력 경로 근처 실제 장소(이름·카테고리·주소)로 채워진다 — 목업(`mockCourse.ts`) 제거
- [x] 무료 3개(카페·식당·공원) / 프리미엄 5개(+볼거리·문화), 카테고리 중복 최소화, 경로 지점에 고르게 분산
- [x] 반경 500m → 1km → 2km 확대, 그래도 부족하면 찾은 만큼 + 결과 화면 안내 / 0개면 422 `NO_NEARBY_SPOTS`
- [x] 선택 로직은 외부 호출 없이 단위 테스트로 검증 (`curateSpots`, `buildCourse`)

**구현 메모**
- 카카오는 평점 미제공 → `sort=accuracy` 순위를 대리 지표로 사용
- 필터: CE7에서 만화·보드카페 제외, 공원은 키워드 검색 후 `> 공원` 카테고리만 + 어린이공원 후순위, 경로 지명 자체는 스팟에서 제외
- 지오코딩을 순차로 바꿔 직전 지점에서 가장 가까운 후보 선택 (상위 5개 중) — "원대리"가 충북 제천으로, "한강공원"이 여의도로 잡히던 문제 해결
- LLM 폴백을 OpenRouter `models` 대신 직접 순회로 변경 — 모델당 8초 제한, 429/빈 응답 시 다음 모델, "reasoning is mandatory"(ernie) 400이면 reasoning 옵션 빼고 재시도
- 제목/소개/스팟 설명은 템플릿 (`templateCourseText`, "OO 근처의 카페.") → FR-4에서 교체
- 모델 순서를 `ernie → gemma → nemotron`으로 변경 (2026-11-13 벤치마크: ernie 1.2~2.5s·4/5 정확, gemma 5/5 429, nemotron 정확하나 17~25s 지연 빈발). `.env.local`·Vercel 3개 환경 모두 반영
- 알려진 한계: ernie가 빈 응답이면 ~10초까지 걸릴 수 있음, ernie는 preview 모델이라 중단 가능 (폴백으로 흡수). FR-4와 함께 캐싱(NFR-5) 검토

### 3-1. LLM 한도 대응 — NFR-3/NFR-5 ✅ (2026-11-13)
배포 직후 운영에서 전 요청 502 — 원인은 OpenRouter **계정 단위 무료 일일 한도**(`429 free-models-per-day`, 크레딧 미충전 계정). 개발 테스트와 운영이 같은 계정 한도를 나눠 씀. 크레딧 충전(B) 대신 코드로 대응(C):

- [x] 지명 추출 캐시: `unstable_cache`로 같은 문장(공백 정규화) 결과 30일 재사용, 실패는 캐시 안 함. 프롬프트 변경 시 키(`extract-place-names-v1`) 버전 올릴 것
- [x] 규칙 기반 비상 추출기(`ruleBasedPlaceNames`): LLM이 `UpstreamError`일 때만 사용 — "OO역/동/공원/길/궁/시장…" 접미사 + 조사 제거 + 불용어(출근길·운동·등산 등)
- [x] `OPENROUTER_API_KEY`가 비어 있으면 LLM을 건너뜀 → 로컬 개발 시 키를 비워 운영 한도 보호 가능
- [x] 경로 이탈 방지: 직전 지점에서 30km 넘게 떨어진 지오코딩 결과는 버림 ("돌담길" → 춘천 사례)
- 확인: LLM 한도 소진 상태에서 로컬 e2e 4건 정상(0.2~0.7s). 캐시 적중은 LLM 복구 후 확인 필요

### 4. AI 코스 텍스트 생성 — PRD FR-4 🟡 (2026-11-13, 코드 완료 · 실 LLM 품질 미확인)
- [x] `courseText.ts`: 경로+스팟(이름·카테고리·주소)을 주고 제목(≤20자)·소개(1~2문장)·스팟 설명(1문장)을 JSON으로 생성
- [x] 사실성 가드: 영업시간·가격·메뉴·평점·역사 등 주어지지 않은 사실 금지 (프롬프트) / 응답 검증 — 길이 초과·알 수 없는 id·빈 값은 버리고 해당 부분만 템플릿 유지
- [x] 폴백: LLM 장애·한도·형식 오류 시 템플릿 문구로 코스 완성 (생성 자체는 실패하지 않음) — 한도 소진 상태에서 로컬 e2e로 확인
- [x] 캐시: `unstable_cache` 키 `course-text-v1` (places+spots 인자 포함), 30일
- [ ] **실제 LLM 생성 문구 품질 확인** — OpenRouter 일일 한도 초기화 후. 톤·사실 날조 여부·응답 시간 점검, 필요 시 프롬프트 수정 후 캐시 키 버전 올리기
- 참고: OpenRouter 키의 사용 한도가 $100로 설정돼 있음 (무료 계정이라 현재 과금 불가, 크레딧 충전 시 낮출 것)

### 5. 갤러리 서버 저장소 — PRD FR-8 🟡 (2026-11-13, 코드 완료 · 운영 저장소 연결 대기)
- 저장소: **Upstash Redis** (Vercel Marketplace, REST라 SDK 없이 fetch). `gallery:course:{id}` JSON + ZSET `gallery:index`(score=createdAt)
- 범위: **공개 코스만** 서버에 올림. 비공개는 지금처럼 브라우저 localStorage에만
- 위조 방지: 생성 API가 코스(title/intro/spots)에 HMAC 서명(`GALLERY_SIGNING_SECRET`) → 게시 시 검증, 불일치 403
- 소유권: `sha256(anonymousId)`만 저장, 다른 사람의 코스 덮어쓰기·삭제 403. 목록 응답엔 소유자 정보 없음
- API: `GET /api/gallery`(최신 50개), `PUT /api/gallery/[id]`(같은 요청 반복해도 안전), `DELETE /api/gallery/[id]`
- 클라이언트: 공개 저장 시 게시 / 마이페이지 토글 시 게시·삭제 / 마이페이지 방문 시 공개 코스 재동기화(실패분 복구) / 갤러리는 서버 목록 + 로딩·에러·재시도
- 서명 도입 전에 저장한 코스는 서명이 없어 갤러리에 안 올라감 (이 브라우저에만 남음)
- 로컬: Upstash 환경변수가 없으면 **개발 서버에서만** 메모리 저장소, 운영은 502
- [x] 로컬 e2e: 생성→공개 저장→갤러리 노출→비공개 전환→갤러리에서 사라짐, 위조 403, 타인 삭제 403
- [ ] Vercel에 Upstash Redis 연결 + `GALLERY_SIGNING_SECRET` 등록 → push → 운영 확인

## 오늘 안 만들 기능 (다음 세션 이후)
- 갤러리 서버 저장소 이전 (FR-8) — 저장소(Vercel Postgres/KV, Supabase 등) 선택 필요
- anonymousId 유실 안내 문구 (NFR-6)
- AI 여행기 실제 LLM 연동, 체크인 사진 영속화 (P2)
