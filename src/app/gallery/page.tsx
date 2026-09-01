"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getOrCreateAnonymousId } from "@/lib/anonymousId";
import {
  filterRoutesByVisibility,
  loadSavedRoutes,
  sortRoutesByNewest,
  type SavedRoute,
} from "@/lib/savedRoutes";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function GalleryPage() {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);

  useEffect(() => {
    const id = getOrCreateAnonymousId(localStorage);
    const loaded = loadSavedRoutes(localStorage, id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoutes(sortRoutesByNewest(filterRoutesByVisibility(loaded, "public")));
  }, []);

  const [featured, ...rest] = routes;

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFDFB] text-[#26332F]">
      <header className="flex h-[76px] items-center justify-between border-b border-[rgba(38,51,47,0.1)] px-6 lg:px-14">
        <Link href="/" className="text-[17px] font-bold tracking-[-.008em]">
          동네 큐레이터
        </Link>
        <div className="flex items-center gap-8 text-[14.5px] text-[#5C6B66]">
          <span className="font-bold text-[#26332F]">갤러리</span>
          <Link href="/my" className="hover:text-[#E8623C]">
            내 코스
          </Link>
          <Link
            href="/plan"
            className="rounded-full border border-[rgba(38,51,47,0.28)] px-[18px] py-[9px] font-bold text-[#26332F]"
          >
            프리미엄
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 py-14 lg:px-0">
        <div className="flex w-full max-w-[1040px] flex-col gap-[26px]">
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-[30px] font-bold tracking-[-.014em] lg:text-[38px]">
                갤러리
              </h1>
              <p className="text-[14.5px] text-[#5C6B66]">
                이 브라우저에 공개로 저장한 코스만 보여요
              </p>
            </div>
            <span className="text-[14px] font-bold">최신순</span>
          </div>

          {!featured ? (
            <p className="py-16 text-center text-[14px] text-[#5C6B66]">
              아직 공개로 저장된 코스가 없어요
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-3.5 rounded-[18px] bg-[#16332E] p-8 text-[#F2FAF6] lg:flex-row lg:items-end lg:justify-between lg:gap-10">
                <div className="flex max-w-[620px] flex-col gap-3.5">
                  <span className="font-archivo text-[11px] tracking-[.28em] text-[#3FBFA3] uppercase">
                    Editor&apos;s pick
                  </span>
                  <p className="text-[24px] leading-[1.3] font-bold tracking-[-.012em] break-words lg:text-[32px]">
                    {featured.title}
                  </p>
                  <p className="line-clamp-2 text-[14px] leading-[1.8] text-[#9EB4AD] lg:text-[15px]">
                    {featured.intro}
                  </p>
                </div>
                <span className="text-[13px] text-[#87A19A]">
                  스팟 {featured.spots.length} · {formatDate(featured.createdAt)}
                </span>
              </div>

              {rest.length > 0 && (
                <div className="flex flex-col">
                  {rest.map((route, i) => (
                    <div
                      key={route.id}
                      className="flex flex-col gap-3 border-t border-[rgba(38,51,47,0.14)] py-[26px] lg:flex-row lg:items-start lg:justify-between lg:gap-10"
                    >
                      <div className="flex gap-6">
                        <span className="font-archivo pt-1 text-[14px] font-semibold text-[#E8623C]">
                          {String(i + 2).padStart(2, "0")}
                        </span>
                        <div className="flex max-w-[760px] flex-col gap-2">
                          <p className="text-[19px] font-bold tracking-[-.008em] lg:text-[21px]">
                            {route.title}
                          </p>
                          <p className="line-clamp-2 text-[14px] leading-[1.8] text-[#5C6B66] lg:text-[15px]">
                            {route.intro}
                          </p>
                        </div>
                      </div>
                      <span className="pt-1.5 text-[13.5px] whitespace-nowrap text-[#8D9A95]">
                        스팟 {route.spots.length} · {formatDate(route.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <p className="mt-2">
            <Link href="/" className="text-[14px] font-bold">
              경로 입력하러 가기
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
