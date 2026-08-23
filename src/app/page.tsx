"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isValidRouteInput } from "./validateRouteInput";

export default function Home() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    if (!isValidRouteInput(value)) {
      setError("10~300자로 입력해주세요.");
      return;
    }
    setError("");
    router.push(`/generate?text=${encodeURIComponent(value)}`);
  }

  return (
    <div>
      <p>경로를 입력해주세요 (예: 출근길에 대림역에서 2호선 갈아타고 강남역에서 내려요)</p>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <button onClick={handleSubmit}>제출</button>
      {error && <p>{error}</p>}
      <p>
        <Link href="/my">내가 만든 코스 보기</Link>
      </p>
    </div>
  );
}
