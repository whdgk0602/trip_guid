"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getOrCreateAnonymousId } from "@/lib/anonymousId";
import {
  loadSavedRoutes,
  persistSavedRoutes,
  setSavedRouteVisibility,
  type SavedRoute,
} from "@/lib/savedRoutes";

export default function MyPage() {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [anonymousId, setAnonymousId] = useState("");

  useEffect(() => {
    const id = getOrCreateAnonymousId(localStorage);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnonymousId(id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFDFB] p-6 text-[#26332F]">
      <p className="text-[19px] font-bold">내가 만든 코스</p>

      {routes.length === 0 ? (
        <p className="mt-4 text-[14px] text-[#5C6B66]">
          아직 만든 코스가 없어요.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {routes.map((route) => (
            <li
              key={route.id}
              className="flex items-center justify-between gap-3 rounded-[14px] border border-[rgba(38,51,47,0.14)] p-4"
            >
              <span className="font-bold">{route.title}</span>
              <button
                onClick={() => toggleVisibility(route.id)}
                className={`rounded-full px-3 py-1 text-[12px] font-bold ${
                  route.visibility === "public"
                    ? "bg-[rgba(46,107,79,0.1)] text-[#2E6B4F]"
                    : "bg-[rgba(38,51,47,0.08)] text-[#5C6B66]"
                }`}
              >
                {route.visibility === "public" ? "공개" : "비공개"}
              </button>
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
