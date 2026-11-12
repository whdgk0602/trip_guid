"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  EXAMPLE_ROUTE_TEXT,
  getGenerateErrorView,
  toGenerateErrorCode,
  type GenerateErrorCode,
} from "./generateError";
import { getLoadingPhaseText } from "./loadingPhase";
import SaveModal from "./SaveModal";
import ShareModal from "./ShareModal";
import { getOrCreateAnonymousId } from "@/lib/anonymousId";
import {
  addSavedRoute,
  loadSavedRoutes,
  persistSavedRoutes,
  type Visibility,
} from "@/lib/savedRoutes";
import { getTier, type Tier } from "@/lib/tier";

type Spot = {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
};

type Course = {
  title: string;
  intro: string;
  spots: Spot[];
  /** 등급 기준 요청 개수 — 주변 장소가 부족하면 spots가 이보다 적음 */
  requestedSpotCount?: number;
};

export default function GenerateClient({ text }: { text: string }) {
  const [phaseText, setPhaseText] = useState(() => getLoadingPhaseText(0));
  const [course, setCourse] = useState<Course | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [tier, setTier] = useState<Tier>("free");
  const [errorCode, setErrorCode] = useState<GenerateErrorCode | null>(null);
  const [attempt, setAttempt] = useState(0);

  function handleSave(visibility: Visibility) {
    if (!course) return;
    const anonymousId = getOrCreateAnonymousId(localStorage);
    const existing = loadSavedRoutes(localStorage, anonymousId);
    const updated = addSavedRoute(existing, course, visibility);
    persistSavedRoutes(localStorage, anonymousId, updated);
  }

  useEffect(() => {
    const anonymousId = getOrCreateAnonymousId(localStorage);
    const currentTier = getTier(localStorage, anonymousId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTier(currentTier);

    const startedAt = Date.now();
    const timer = setInterval(() => {
      setPhaseText(getLoadingPhaseText(Date.now() - startedAt));
    }, 100);

    let cancelled = false;
    fetch("/api/routes/generate", {
      method: "POST",
      body: JSON.stringify({ text, tier: currentTier }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        clearInterval(timer);
        if (response.ok) {
          setCourse(data as Course);
        } else {
          setErrorCode(toGenerateErrorCode(data));
        }
      })
      .catch(() => {
        if (cancelled) return;
        clearInterval(timer);
        setErrorCode("UPSTREAM_ERROR");
      });

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [text, attempt]);

  function handleRetry() {
    setErrorCode(null);
    setCourse(null);
    setPhaseText(getLoadingPhaseText(0));
    setAttempt((n) => n + 1);
  }

  if (errorCode) {
    const view = getGenerateErrorView(errorCode);

    return (
      <div className="flex min-h-screen flex-col bg-[#FDFDFB] text-[#26332F]">
        <header className="flex h-[76px] items-center border-b border-[rgba(38,51,47,0.1)] px-6 lg:px-14">
          <Link href="/" className="text-[17px] font-bold">
            데일리루트
          </Link>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="flex w-full max-w-[560px] flex-col items-center gap-6 text-center">
            <div className="flex flex-col gap-3">
              <h1 className="text-[24px] leading-[1.35] font-bold tracking-[-.008em] break-keep lg:text-[32px]">
                {view.title}
              </h1>
              <p className="text-[14px] leading-[1.7] text-[#5C6B66] lg:text-[16px]">
                {view.description}
              </p>
            </div>

            {view.showExample && (
              <div className="w-full rounded-[16px] border border-[rgba(38,51,47,0.14)] bg-white p-4 text-left">
                <span className="text-[12px] font-bold text-[#7C8D87]">
                  이렇게 입력해보세요
                </span>
                <p className="mt-1.5 text-[14px] leading-[1.7] lg:text-[15px]">
                  {EXAMPLE_ROUTE_TEXT}
                </p>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3">
              {view.canRetry && (
                <button
                  onClick={handleRetry}
                  className="rounded-full bg-[#E8623C] px-6 py-3 text-[14.5px] font-bold text-white"
                >
                  다시 시도
                </button>
              )}
              <Link
                href="/"
                className={`rounded-full px-6 py-3 text-[14.5px] font-bold ${
                  view.canRetry
                    ? "border border-[rgba(38,51,47,0.28)]"
                    : "bg-[#E8623C] text-white"
                }`}
              >
                다시 입력하기
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!course) {
    const isBuildingPhase = phaseText !== "주변 장소 찾는 중";

    return (
      <div className="flex min-h-screen flex-col bg-[#16332E] text-[#F2FAF6]">
        <header className="flex h-[76px] items-center border-b border-[rgba(242,250,246,0.12)] px-6 lg:px-14">
          <span className="text-[17px] font-bold">데일리루트</span>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 lg:gap-11">
          <div className="flex gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#3FBFA3] [animation:pulse_1.4s_infinite]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#3FBFA3] [animation:pulse_1.4s_infinite_.2s]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#3FBFA3] [animation:pulse_1.4s_infinite_.4s]" />
          </div>

          <div className="flex max-w-[720px] flex-col items-center gap-4 text-center">
            <h1 className="text-[28px] leading-[1.3] font-bold tracking-[-.008em] lg:text-[38px] lg:tracking-[-.012em]">
              주변 장소를 찾고 있어요
            </h1>
            <p className="text-[14px] leading-[1.7] text-[#9EB4AD] lg:text-[16px] lg:leading-[1.8]">
              입력하신 경로에서 지명을 읽고 있습니다. 보통 10초 안에 끝나요.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 lg:flex-row lg:gap-0">
            <div className="flex items-center gap-3 lg:pr-7">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#3FBFA3] text-[12px] font-bold text-[#16332E]">
                ✓
              </span>
              <span className="text-[14.5px] lg:text-[15px]">
                경로에서 장소 읽기
              </span>
            </div>
            <div className="hidden h-px w-14 bg-[rgba(242,250,246,0.24)] lg:block" />
            <div className="flex items-center gap-3 lg:px-7">
              <span
                className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
                  isBuildingPhase
                    ? "border-[rgba(242,250,246,0.25)]"
                    : "border-[#3FBFA3]"
                }`}
              />
              <span
                className={`text-[14.5px] lg:text-[15px] ${
                  isBuildingPhase ? "text-[#75918B]" : "font-bold"
                }`}
              >
                주변 장소 찾기
              </span>
            </div>
            <div className="hidden h-px w-14 bg-[rgba(242,250,246,0.24)] lg:block" />
            <div className="flex items-center gap-3 lg:pl-7">
              <span
                className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
                  isBuildingPhase
                    ? "border-[#3FBFA3]"
                    : "border-[rgba(242,250,246,0.25)]"
                }`}
              />
              <span
                className={`text-[14.5px] lg:text-[15px] ${
                  isBuildingPhase ? "font-bold" : "text-[#75918B]"
                }`}
              >
                코스 만들기
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 pb-8 text-[13px] text-[#75918B] lg:px-14 lg:pb-10">
          창을 닫으면 생성이 중단됩니다.
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFDFB] text-[#26332F]">
      <header className="flex h-[76px] items-center justify-between border-b border-[rgba(38,51,47,0.1)] px-6 lg:px-14">
        <span className="text-[17px] font-bold">데일리루트</span>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-[#5C6B66] lg:text-[13.5px]">
            {tier === "premium" ? "프리미엄 등급" : "무료 등급"} · 스팟{" "}
            {course.spots.length}개
          </span>
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="rounded-full border border-[rgba(38,51,47,0.28)] px-4 py-2 text-[13.5px] font-bold"
          >
            공유하기
          </button>
          <button
            onClick={() => setIsSaveModalOpen(true)}
            className="rounded-full border border-[rgba(38,51,47,0.28)] px-4 py-2 text-[13.5px] font-bold"
          >
            저장하기
          </button>
        </div>
      </header>

      {isSaveModalOpen && (
        <SaveModal
          onSave={handleSave}
          onClose={() => setIsSaveModalOpen(false)}
        />
      )}

      {isShareModalOpen && (
        <ShareModal
          course={course}
          tier={tier}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      <main className="flex flex-1 flex-col items-center px-6 py-9 lg:px-0 lg:py-[72px]">
        <div className="flex w-full max-w-[720px] flex-col gap-6 lg:gap-[30px]">
          <div className="flex flex-col gap-3 lg:gap-4">
            <h1 className="text-[27px] leading-[1.24] font-bold tracking-[-.012em] break-words lg:text-[48px] lg:leading-[1.2] lg:tracking-[-.016em]">
              {course.title}
            </h1>
            <p className="text-[13.5px] leading-[1.75] text-[#4C5B56] break-words lg:text-[17px] lg:leading-[1.85]">
              {course.intro}
            </p>
          </div>
          <div className="h-px bg-[rgba(38,51,47,0.14)]" />
          {course.requestedSpotCount !== undefined &&
            course.spots.length < course.requestedSpotCount && (
              <p className="rounded-[12px] bg-[#F4F1EA] px-4 py-3 text-[13px] leading-[1.6] text-[#5C6B66] lg:text-[14px]">
                주변에 들를 만한 곳이 많지 않아 {course.spots.length}곳만
                담았어요.
              </p>
            )}
          <ul className="flex flex-col gap-2.5 lg:gap-4">
            {course.spots.map((spot, i) => (
              <li
                key={spot.id}
                className="flex gap-3.5 rounded-[16px] border border-[rgba(38,51,47,0.14)] bg-white p-3.5 lg:gap-[22px] lg:p-[26px]"
              >
                <span className="font-archivo text-2xl leading-none text-[#E8623C] lg:text-[30px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex flex-col gap-1.5 lg:gap-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[16.5px] font-bold tracking-[-.008em] break-words lg:text-[20px]">
                      {spot.name}
                    </span>
                    <span className="rounded-full border border-[rgba(38,51,47,0.2)] px-2 py-0.5 text-[11.5px] text-[#7C8D87] lg:text-[12px]">
                      {spot.category}
                    </span>
                  </div>
                  <p className="text-[13.5px] leading-[1.75] text-[#5C6B66] break-words lg:text-[15px] lg:leading-[1.8]">
                    {spot.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
