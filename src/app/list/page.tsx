"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "skeleton-values";

export default function ListPage() {
  const [values, setValues] = useState<string[]>([]);

  useEffect(() => {
    setValues(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
  }, []);

  return (
    <div>
      <ul>
        {values.map((v, i) => (
          <li key={i}>{v}</li>
        ))}
      </ul>
      <p>
        <a href="/input">입력하러 가기</a>
      </p>
    </div>
  );
}
