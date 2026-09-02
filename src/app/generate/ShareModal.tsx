"use client";

import Link from "next/link";
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
    <div className="fixed inset-0 z-50 flex flex-col bg-[#16332E] text-[#F2FAF6]">
      <header className="flex h-[76px] items-center justify-between border-b border-[rgba(242,250,246,0.12)] px-6 lg:px-14">
        <span className="text-[17px] font-bold">공유 카드</span>
        <button onClick={onClose} className="text-xl leading-none">
          ✕
        </button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-10 lg:flex-row lg:gap-16 lg:px-14">
        <div
          ref={cardRef}
          className="flex w-full max-w-[400px] flex-col rounded-lg bg-[#FDFDFB] p-9 pb-10 text-[#26332F] shadow-[0_26px_60px_rgba(0,0,0,0.4)] lg:h-[500px] lg:w-[400px]"
        >
          <span className="font-archivo text-[11px] tracking-[.3em] text-[#E8623C] uppercase">
            Daily Route
          </span>
          <h3 className="mt-7 text-[28px] leading-[1.24] font-bold tracking-[-.014em] break-words lg:text-[36px]">
            {course.title}
          </h3>
          <div className="mt-6 h-px bg-[rgba(38,51,47,0.18)]" />
          <ul className="mt-[22px] flex flex-col gap-[13px]">
            {course.spots.slice(0, 3).map((spot, i) => (
              <li key={spot.id} className="flex items-baseline gap-3">
                <span className="font-archivo text-[13px] font-semibold text-[#E8623C]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[16px] font-medium break-words">
                  {spot.name}
                </span>
              </li>
            ))}
          </ul>
          {tier !== "premium" && (
            <div className="mt-auto flex justify-end pt-6">
              <span className="rounded-full border border-[rgba(38,51,47,0.18)] px-[10px] py-[5px] text-[11px] font-bold text-[#93A69F]">
                데일리루트로 만듦
              </span>
            </div>
          )}
        </div>

        <div className="flex w-full max-w-[360px] flex-col gap-5">
          <h2 className="text-[22px] font-bold tracking-[-.008em] lg:text-[26px]">
            카드로 저장하기
          </h2>
          <p className="text-[14px] leading-[1.8] text-[#9EB4AD] lg:text-[15px]">
            이미지로 내려받아 공유할 수 있어요.
          </p>
          <button
            onClick={handleSaveImage}
            disabled={isSaving}
            className="rounded-[13px] bg-[#F2FAF6] py-[17px] text-center text-[15.5px] font-bold text-[#26332F] disabled:opacity-60"
          >
            {isSaving ? "저장 중..." : "이미지 저장"}
          </button>
          {hasFailed && (
            <p className="text-sm text-[#F2A9A0]">
              이미지 저장에 실패했어요. 다시 시도해주세요.
            </p>
          )}
          {tier !== "premium" && (
            <div className="flex flex-col gap-[10px] rounded-xl border border-[rgba(63,191,163,0.35)] bg-[rgba(63,191,163,0.14)] p-[18px]">
              <p className="text-[14px] leading-[1.7] text-[#C0E7DA]">
                워터마크 없이 저장하려면 프리미엄이 필요해요.
              </p>
              <Link
                href="/plan"
                className="text-[14px] font-bold text-[#3FBFA3]"
              >
                프리미엄 보기 →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
