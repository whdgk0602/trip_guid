# 데일리루트 (Daily Route)

> 당신의 평범한 일상 경로를, AI가 매력적인 로컬 여행 콘텐츠로 재구성해주는 서비스.

일상 루트(출퇴근길, 동네 산책로 등)를 한 문장으로 입력하면 주변 장소를 큐레이션하고 스토리텔링해서, 그 지역을 모르는 사람에게는 매력적인 "로컬 가이드 콘텐츠"로 보이게 만들어줍니다. 결과물은 SNS 공유용 이미지 카드로 내보낼 수 있습니다.

**Live demo**: https://trip-guid.vercel.app

## 주요 기능

- **텍스트 경로 입력** → AI 큐레이션 코스 생성 (지도 UI 없이 한 문장 입력만)
- **코스 저장 & 공개/비공개 선택** — 로그인 없이 브라우저 기반(`anonymousId`)으로 식별
- **마이페이지** — 저장한 코스를 공개/비공개로 필터링
- **갤러리** — 이 브라우저에 공개로 저장된 코스를 최신순으로 열람
- **공유 카드 이미지 내보내기** — 코스를 PNG 카드로 다운로드
- **무료/프리미엄 등급 게이팅** — 가짜 구매 플로우로 등급 전환 시연 (스팟 개수, 워터마크 여부, 체크인·AI여행기 접근 차등)
- **체크인 + AI 여행기** (프리미엄, 스트레치) — 코스 완주 체크인 기록을 기반으로 개인화 여행기 생성

## 현재 구현 상태

**Phase 0 (프로토타입, 목업 데이터)** 단계입니다. `POST /api/routes/generate`는 실제 카카오 지오코딩·LLM 연동 없이 고정된 목업 코스 데이터를 반환합니다. 실제 API 연동은 이후 Phase 1에서 진행됩니다. 자세한 로드맵은 [`docs/prd.md`](./docs/prd.md) 8장을 참고하세요.

## 기술 스택

- [Next.js](https://nextjs.org) (App Router, TypeScript) + Tailwind CSS v4
- [Vitest](https://vitest.dev)로 단위 테스트 (계산/판단 로직 위주)
- Vercel 배포 (main 브랜치 푸시 시 자동 배포)
- 별도 백엔드 없이 Next.js Route Handlers(`src/app/api/`)로 시작

## 시작하기

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

```bash
npm test    # vitest run
npm run lint
npm run build
```

## 프로젝트 문서

기획/설계 문서는 항상 `docs/*.md`가 원본(source of truth)입니다.

1. [`docs/concept.md`](./docs/concept.md) — 핵심 컨셉
2. [`docs/feature-spec.md`](./docs/feature-spec.md) — 화면별 기능 상세
3. [`docs/prd.md`](./docs/prd.md) — 요구사항(FR/NFR), 범위, 성공지표
4. [`docs/business-model.md`](./docs/business-model.md) — 수익 모델(포트폴리오용 사고 실험)
5. [`docs/slices/`](./docs/slices) — 기능별 구현 슬라이스 스펙 (완료 조건 · 안 되는 경우 · 확인 방법)
6. [`PLAN.md`](./PLAN.md) — 세션별 실행 계획

프로젝트 전체 규칙은 [`CLAUDE.md`](./CLAUDE.md)를 참고하세요.

## 범위 밖 (Out of Scope)

회원가입/로그인, 지도 기반 경로 입력 UI, 실제 PG사 결제 연동, 사용량 기반 과금, 실시간 GPS 트래킹, 소셜 기능(팔로우/댓글), 다국어 지원 — [`docs/prd.md`](./docs/prd.md) 5.3장 참고.
