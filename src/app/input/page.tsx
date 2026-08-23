"use client";

import { useState } from "react";

const STORAGE_KEY = "skeleton-values";

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
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <button onClick={handleSave}>저장</button>
      <p>
        <a href="/list">목록 보기</a>
      </p>
    </div>
  );
}
