"use client";

import { useState } from "react";

const STORAGE_KEY = "saved-routes";

export default function InputPage() {
  const [value, setValue] = useState("");

  function handleSave() {
    if (!value) return;
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    existing.push(value);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    setValue("");
  }

  return (
    <div>
      <p>경로를 입력해주세요 (예: 출근길에 대림역에서 2호선 갈아타고 강남역에서 내려요)</p>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <button onClick={handleSave}>저장</button>
      <p>
        <a href="/my">내가 만든 코스 보기</a>
      </p>
    </div>
  );
}
