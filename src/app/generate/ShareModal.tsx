"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { buildShareFileName } from "@/lib/shareFileName";
import type { Tier } from "@/lib/tier";

type Spot = {
  id: string;
  name: string;
};

type ShareCourse = {
  title: string;
  spots: Spot[];
};

export default function ShareModal({
  course,
  tier,
  onClose,
}: {
  course: ShareCourse;
  tier: Tier;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  async function handleSaveImage() {
    if (!cardRef.current || isSaving) return;
    setIsSaving(true);
    setHasFailed(false);
    try {
      // Google Fonts is loaded cross-origin via a <link> tag (not next/font),
      // so html-to-image can't read its cssRules to embed the fonts — that
      // CORS failure would otherwise hang the export. skipFonts avoids it.
      // A timeout is still needed as a safety net: image decoding during
      // canvas conversion has been observed to stall indefinitely.
      const dataUrl = await Promise.race([
        toPng(cardRef.current, { skipFonts: true }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timed out")), 8000),
        ),
      ]);
      const link = document.createElement("a");
      link.download = buildShareFileName(course.title);
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("이미지 저장에 실패했어요", error);
      setHasFailed(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[400px] rounded-2xl bg-white p-6">
        <h2 className="text-lg font-bold">공유용 카드 미리보기</h2>

        <div
          ref={cardRef}
          className="mt-4 flex flex-col gap-4 rounded-xl bg-white p-6 pb-10"
        >
          <h3 className="text-xl font-bold break-words">{course.title}</h3>
          <ul className="flex flex-col gap-1.5">
            {course.spots.slice(0, 3).map((spot) => (
              <li key={spot.id} className="text-sm text-[#26332F]">
                {spot.name}
              </li>
            ))}
          </ul>
          {tier !== "premium" && (
            <p className="text-xs text-[#9AA6A1]">동네 큐레이터로 만듦</p>
          )}
        </div>

        {hasFailed && (
          <p className="mt-3 text-sm text-[#D24B3E]">
            이미지 저장에 실패했어요. 다시 시도해주세요.
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-[rgba(38,51,47,0.28)] px-5 py-2 text-sm font-bold"
          >
            닫기
          </button>
          <button
            onClick={handleSaveImage}
            disabled={isSaving}
            className="rounded-xl bg-[#26332F] px-6 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {isSaving ? "저장 중..." : "이미지 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
