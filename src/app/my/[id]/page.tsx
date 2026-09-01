"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getOrCreateAnonymousId } from "@/lib/anonymousId";
import { loadSavedRoutes, type SavedRoute } from "@/lib/savedRoutes";
import { getTier, type Tier } from "@/lib/tier";
import {
  addCheckin,
  buildTravelogue,
  isRouteComplete,
  loadCheckins,
  loadTravelogue,
  persistCheckins,
  persistTravelogue,
  type Checkin,
} from "@/lib/checkins";

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const [anonymousId, setAnonymousId] = useState("");
  const [tier, setTier] = useState<Tier>("free");
  const [route, setRoute] = useState<SavedRoute | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [travelogue, setTravelogue] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [draftPhotos, setDraftPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    const id = getOrCreateAnonymousId(localStorage);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnonymousId(id);
    setTier(getTier(localStorage, id));

    const routes = loadSavedRoutes(localStorage, id);
    const found = routes.find((r) => r.id === params.id) ?? null;
    setRoute(found);
    if (found) {
      setCheckins(loadCheckins(localStorage, id, found.id));
      setTravelogue(loadTravelogue(localStorage, id, found.id));
    }
  }, [params.id]);

  function handlePhotoChange(spotId: string, file: File | null) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setDraftPhotos((prev) => ({ ...prev, [spotId]: url }));
  }

  function handleCheckin(spotId: string) {
    if (!route) return;
    const note = draftNotes[spotId]?.trim();
    if (!note) return;
    const updated = addCheckin(checkins, spotId, note);
    setCheckins(updated);
    persistCheckins(localStorage, anonymousId, route.id, updated);
  }

  function handleGenerateTravelogue() {
    if (!route) return;
    const text = buildTravelogue(route.title, route.spots, checkins);
    setTravelogue(text);
    persistTravelogue(localStorage, anonymousId, route.id, text);
  }

  if (!route) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FDFDFB] px-6 text-center text-[#26332F]">
        <p className="text-[16px] text-[#5C6B66]">코스를 찾을 수 없어요</p>
        <Link href="/my" className="text-[14px] font-bold">
          내 코스로 돌아가기
        </Link>
      </div>
    );
  }

  const complete = isRouteComplete(route.spots, checkins);
  const checkinCount = checkins.length;
  const progressPct = Math.round((checkinCount / route.spots.length) * 100);

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFDFB] text-[#26332F]">
      <header className="flex h-[76px] items-center justify-between border-b border-[rgba(38,51,47,0.1)] px-6 lg:px-14">
        <Link href="/" className="text-[17px] font-bold tracking-[-.008em]">
          동네 큐레이터
        </Link>
        {tier === "premium" && (
          <span className="rounded-full bg-[rgba(232,98,60,0.14)] px-3 py-1.5 text-[12px] font-bold text-[#B14324]">
            프리미엄
          </span>
        )}
      </header>

      <main className="flex flex-1 flex-col items-center px-6 py-14 lg:px-0">
        <div className="flex w-full max-w-[720px] flex-col gap-7">
          {tier !== "premium" ? (
            <>
              <h1 className="text-[28px] font-bold tracking-[-.012em] break-words lg:text-[36px]">
                {route.title}
              </h1>
              <div className="rounded-2xl border border-[rgba(38,51,47,0.14)] bg-white p-6">
                <p className="text-[14.5px] text-[#5C6B66]">
                  체크인 + AI 여행기는 프리미엄 전용 기능이에요
                </p>
                <Link
                  href="/plan"
                  className="mt-3 inline-block text-[14px] font-bold"
                >
                  프리미엄 알아보기 →
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                <span className="font-archivo text-[12px] tracking-[.28em] text-[#E8623C] uppercase">
                  Check-in · {route.spots.length}곳 중 {checkinCount}곳 완료
                </span>
                <h1 className="text-[28px] leading-[1.24] font-bold tracking-[-.014em] break-words lg:text-[36px]">
                  {route.title}
                </h1>
                <div className="mt-1.5 h-[5px] rounded-full bg-[rgba(38,51,47,0.12)]">
                  <div
                    className="h-[5px] rounded-full bg-[#E8623C] transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3.5">
                {route.spots.map((spot) => {
                  const checkin = checkins.find((c) => c.spotId === spot.id);
                  if (checkin) {
                    return (
                      <div
                        key={spot.id}
                        className="flex items-start gap-5 rounded-2xl border border-[rgba(38,51,47,0.14)] bg-white p-6"
                      >
                        <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#26332F] text-[12px] font-bold text-[#F2FAF6]">
                          ✓
                        </span>
                        <div className="flex flex-1 flex-col gap-2.5">
                          <span className="text-[18px] font-bold">
                            {spot.name}
                          </span>
                          <span className="text-[15px] leading-[1.8] text-[#5C6B66]">
                            &ldquo;{checkin.note}&rdquo;
                          </span>
                        </div>
                        {draftPhotos[spot.id] && (
                          // eslint-disable-next-line @next/next/no-img-element -- session-only blob: preview, not a static asset
                          <img
                            src={draftPhotos[spot.id]}
                            alt=""
                            className="h-[110px] w-[110px] flex-none rounded-[10px] border border-[rgba(38,51,47,0.1)] object-cover"
                          />
                        )}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={spot.id}
                      className="flex flex-col gap-3 rounded-2xl border border-dashed border-[rgba(38,51,47,0.28)] p-6"
                    >
                      <div className="flex items-center gap-5">
                        <span className="h-6 w-6 flex-none rounded-full border-2 border-[rgba(38,51,47,0.3)]" />
                        <div className="flex flex-col gap-[5px]">
                          <span className="text-[18px] font-bold text-[#5C6B66]">
                            {spot.name}
                          </span>
                          <span className="text-[14px] text-[#8D9A95]">
                            도착하면 한 줄 남기기
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2.5 pl-11">
                        <input
                          value={draftNotes[spot.id] ?? ""}
                          onChange={(e) =>
                            setDraftNotes((prev) => ({
                              ...prev,
                              [spot.id]: e.target.value,
                            }))
                          }
                          placeholder="한 줄 기록을 남겨보세요"
                          className="rounded-lg border border-[rgba(38,51,47,0.2)] px-3.5 py-2.5 text-[14px] placeholder:text-[#9BA8A3]"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handlePhotoChange(
                              spot.id,
                              e.target.files?.[0] ?? null,
                            )
                          }
                          className="text-[13px]"
                        />
                        {draftPhotos[spot.id] && (
                          // eslint-disable-next-line @next/next/no-img-element -- session-only blob: preview, not a static asset
                          <img
                            src={draftPhotos[spot.id]}
                            alt=""
                            className="h-20 w-20 rounded-lg object-cover"
                          />
                        )}
                        <button
                          onClick={() => handleCheckin(spot.id)}
                          className="w-fit rounded-xl border border-[rgba(38,51,47,0.28)] px-[22px] py-[13px] text-[14.5px] font-bold"
                        >
                          체크인
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {travelogue ? (
                <div className="flex flex-col gap-4 rounded-2xl bg-[#16332E] p-8 text-[#F2FAF6]">
                  <span className="font-archivo text-[11px] tracking-[.28em] text-[#3FBFA3] uppercase">
                    AI 여행기
                  </span>
                  <p className="text-[16px] leading-[2.1] whitespace-pre-line text-[#C7DAD3]">
                    {travelogue}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-[18px]">
                  <button
                    onClick={handleGenerateTravelogue}
                    disabled={!complete}
                    className="rounded-[14px] bg-[#E8623C] px-9 py-[18px] text-[16.5px] font-bold text-white disabled:opacity-40"
                  >
                    여행기 생성하기
                  </button>
                  <span className="text-[14px] text-[#8D9A95]">
                    {complete
                      ? "모든 스팟을 기록했어요"
                      : `${checkinCount}/${route.spots.length}곳 기록했어요`}
                  </span>
                </div>
              )}
            </>
          )}

          <Link href="/my" className="mt-2 w-fit text-[14px] font-bold">
            내 코스로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
}
