"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "saved-routes";

export default function MyPage() {
  const [routes, setRoutes] = useState<string[]>([]);

  useEffect(() => {
    // localStorage isn't available during SSR, so it must be read after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoutes(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
  }, []);

  return (
    <div>
      <p>내가 만든 코스</p>
      <ul>
        {routes.map((route, i) => (
          <li key={i}>{route}</li>
        ))}
      </ul>
      <p>
        <Link href="/">경로 입력하러 가기</Link>
      </p>
    </div>
  );
}
