"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getOrCreateAnonymousId } from "@/lib/anonymousId";
import {
  filterRoutesByVisibility,
  loadSavedRoutes,
  persistSavedRoutes,
  setSavedRouteVisibility,
  type SavedRoute,
  type VisibilityFilter,
} from "@/lib/savedRoutes";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default function MyPage() {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [anonymousId, setAnonymousId] = useState("");
  const [filter, setFilter] = useState<VisibilityFilter>("all");

  useEffect(() => {
    const id = getOrCreateAnonymousId(localStorage);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnonymousId(id);
    setRoutes(loadSavedRoutes(localStorage, id));
  }, []);

  function toggleVisibility(id: string) {
    const route = routes.find((r) => r.id === id);
    if (!route) return;
    const nextVisibility = route.visibility === "public" ? "private" : "public";
    const updated = setSavedRouteVisibility(routes, id, nextVisibility);
    setRoutes(updated);
    persistSavedRoutes(localStorage, anonymousId, updated);
  }

  const visibleRoutes = filterRoutesByVisibility(routes, filter);
  const publicCount = filterRoutesByVisibility(routes, "public").length;
  const privateCount = filterRoutesByVisibility(routes, "private").length;

  const filters: { key: VisibilityFilter; label: string; count: number }[] = [
    { key: "all", label: "전체", count: routes.length },
    { key: "public", label: "공개", count: publicCount },
    { key: "private", label: "비공개", count: privateCount },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFDFB] text-[#26332F]">
      <header className="flex h-[76px] items-center justify-between border-b border-[rgba(38,51,47,0.1)] px-6 lg:px-14">
        <Link href="/" className="text-[17px] font-bold tracking-[-.008em]">
          동네 큐레이터
        </Link>
        <div className="flex items-center gap-8 text-[14.5px] text-[#5C6B66]">
          <Link href="/gallery" className="hover:text-[#E8623C]">
            갤러리
          </Link>
          <span className="font-bold text-[#26332F]">내 코스</span>
          <Link
            href="/plan"
            className="rounded-full border border-[rgba(38,51,47,0.28)] px-[18px] py-[9px] font-bold text-[#26332F]"
          >
            프리미엄
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 py-16 lg:px-0">
        <div className="flex w-full max-w-[1040px] flex-col gap-7">
          {routes.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <span className="font-archivo text-[64px] font-semibold text-[#C4D6D0]">
                00
              </span>
              <p className="text-[16px] text-[#5C6B66]">
                아직 만든 코스가 없어요
              </p>
              <Link
                href="/"
                className="mt-2 rounded-[14px] bg-[#26332F] px-6 py-3 font-bold text-white"
              >
                첫 코스 만들기
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-end">
                <div className="flex flex-col gap-2.5">
                  <h1 className="text-[30px] font-bold tracking-[-.014em] lg:text-[38px]">
                    내 코스
                  </h1>
                  <p className="text-[13.5px] text-[#8B9A94] lg:text-[14px]">
                    이 기기에만 저장된 목록입니다. 브라우저 데이터를 지우면
                    복구할 수 없어요.
                  </p>
                </div>
                <div className="flex gap-2.5">
                  {filters.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      className={`rounded-full px-4 py-[9px] text-[13.5px] font-bold ${
                        filter === f.key
                          ? "bg-[#26332F] text-white"
                          : "border border-[rgba(38,51,47,0.22)] text-[#5C6B66]"
                      }`}
                    >
                      {f.label} {f.count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visibleRoutes.map((route) => (
                  <div
                    key={route.id}
                    className="flex min-h-[190px] flex-col gap-3 rounded-2xl border border-[rgba(38,51,47,0.14)] bg-white p-6"
                  >
                    <button
                      onClick={() => toggleVisibility(route.id)}
                      className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[.06em] ${
                        route.visibility === "public"
                          ? "bg-[rgba(46,107,79,0.1)] text-[#2E6B4F]"
                          : "bg-[rgba(38,51,47,0.08)] text-[#5C6B66]"
                      }`}
                    >
                      {route.visibility === "public" ? "공개" : "비공개"}
                    </button>
                    <Link
                      href={`/my/${route.id}`}
                      className="text-[19px] leading-[1.4] font-bold tracking-[-.008em] break-words"
                    >
                      {route.title}
                    </Link>
                    <p className="line-clamp-2 text-[14px] leading-[1.7] text-[#5C6B66]">
                      {route.spots.map((s) => s.name).join(" · ")}
                    </p>
                    <p className="mt-auto text-[13px] text-[#8D9A95]">
                      {formatDate(route.createdAt)} · 스팟 {route.spots.length}
                    </p>
                  </div>
                ))}
                <Link
                  href="/"
                  className="flex min-h-[190px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[rgba(38,51,47,0.28)]"
                >
                  <span className="font-archivo text-[30px] font-semibold text-[#C4D6D0]">
                    +
                  </span>
                  <span className="text-[15px] font-bold">새 코스 만들기</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
