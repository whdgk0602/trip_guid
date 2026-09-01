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

export default function GalleryPage() {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);

  useEffect(() => {
    const id = getOrCreateAnonymousId(localStorage);
    const loaded = loadSavedRoutes(localStorage, id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoutes(sortRoutesByNewest(filterRoutesByVisibility(loaded, "public")));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFDFB] p-6 text-[#26332F]">
      <p className="text-[19px] font-bold">갤러리</p>
      <p className="mt-1 text-[13px] text-[#5C6B66]">
        이 브라우저에 공개로 저장한 코스만 보여요
      </p>

      {routes.length === 0 ? (
        <p className="mt-6 text-[14px] text-[#5C6B66]">
          아직 공개로 저장된 코스가 없어요
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {routes.map((route) => (
            <li
              key={route.id}
              className="rounded-[14px] border border-[rgba(38,51,47,0.14)] p-4"
            >
              <p className="font-bold">{route.title}</p>
              <p className="mt-1 line-clamp-2 text-[13px] text-[#5C6B66]">
                {route.intro}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6">
        <Link href="/">경로 입력하러 가기</Link>
      </p>
    </div>
  );
}
