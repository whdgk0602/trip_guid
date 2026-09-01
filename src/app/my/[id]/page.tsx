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
      <div className="flex min-h-screen flex-col bg-[#FDFDFB] p-6 text-[#26332F]">
        <p>코스를 찾을 수 없어요</p>
        <p className="mt-4">
          <Link href="/my">내 코스로 돌아가기</Link>
        </p>
      </div>
    );
  }

  const complete = isRouteComplete(route.spots, checkins);
  const checkinCount = checkins.length;

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFDFB] p-6 text-[#26332F]">
      <p className="text-[19px] font-bold">{route.title}</p>

      {tier !== "premium" ? (
        <div className="mt-4 rounded-[14px] border border-[rgba(38,51,47,0.14)] p-4">
          <p className="text-[14px] text-[#5C6B66]">
            체크인 + AI 여행기는 프리미엄 전용 기능이에요
          </p>
          <p className="mt-2">
            <Link href="/plan" className="font-bold">
              프리미엄 알아보기 →
            </Link>
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-4 flex flex-col gap-3">
            {route.spots.map((spot) => {
              const checkin = checkins.find((c) => c.spotId === spot.id);
              return (
                <li
                  key={spot.id}
                  className="rounded-[14px] border border-[rgba(38,51,47,0.14)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{spot.name}</span>
                    <span className="text-[12px] text-[#5C6B66]">
                      {checkin ? "체크인 완료" : "미완료"}
                    </span>
                  </div>
                  {checkin ? (
                    <p className="mt-2 text-[13.5px] text-[#5C6B66]">
                      {checkin.note}
                    </p>
                  ) : (
                    <div className="mt-2 flex flex-col gap-2">
                      <input
                        value={draftNotes[spot.id] ?? ""}
                        onChange={(e) =>
                          setDraftNotes((prev) => ({
                            ...prev,
                            [spot.id]: e.target.value,
                          }))
                        }
                        placeholder="한 줄 기록을 남겨보세요"
                        className="rounded-lg border border-[rgba(38,51,47,0.2)] px-3 py-2 text-[13.5px]"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handlePhotoChange(spot.id, e.target.files?.[0] ?? null)
                        }
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
                        className="w-fit rounded-lg bg-[#26332F] px-4 py-1.5 text-[13px] font-bold text-white"
                      >
                        체크인
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-6">
            {travelogue ? (
              <div className="rounded-[14px] border border-[rgba(38,51,47,0.14)] bg-white p-4">
                <p className="font-bold">나의 여행기</p>
                <p className="mt-2 whitespace-pre-line text-[13.5px] leading-[1.75] text-[#4C5B56]">
                  {travelogue}
                </p>
              </div>
            ) : (
              <button
                onClick={handleGenerateTravelogue}
                disabled={!complete}
                className="rounded-xl bg-[#26332F] px-6 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                {complete
                  ? "여행기 생성"
                  : `여행기 생성 (${checkinCount}/${route.spots.length} 체크인 완료)`}
              </button>
            )}
          </div>
        </>
      )}

      <p className="mt-8">
        <Link href="/my">내 코스로 돌아가기</Link>
      </p>
    </div>
  );
}
