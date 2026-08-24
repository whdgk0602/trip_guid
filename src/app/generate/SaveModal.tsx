"use client";

import Link from "next/link";
import { useState } from "react";
import type { Visibility } from "@/lib/savedRoutes";

type Phase = "choosing" | "saved";

export default function SaveModal({
  onSave,
  onClose,
}: {
  onSave: (visibility: Visibility) => void;
  onClose: () => void;
}) {
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [phase, setPhase] = useState<Phase>("choosing");

  function handleSave() {
    onSave(visibility);
    setPhase("saved");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[400px] rounded-2xl bg-white p-6">
        {phase === "choosing" ? (
          <>
            <h2 className="text-lg font-bold">이 코스를 저장할까요?</h2>
            <p className="mt-1 text-sm text-[#5C6B66]">
              공개 여부는 저장 후에도 바꿀 수 있어요.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[rgba(38,51,47,0.2)] p-4">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === "public"}
                  onChange={() => setVisibility("public")}
                  className="mt-1"
                />
                <span>
                  <span className="block font-bold">공개</span>
                  <span className="block text-sm text-[#5C6B66]">
                    갤러리에 노출됩니다. 다른 사람이 이 코스를 둘러볼 수 있어요.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[rgba(38,51,47,0.2)] p-4">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === "private"}
                  onChange={() => setVisibility("private")}
                  className="mt-1"
                />
                <span>
                  <span className="block font-bold">비공개</span>
                  <span className="block text-sm text-[#5C6B66]">
                    나만 볼 수 있어요. 내 코스에서만 확인됩니다.
                  </span>
                </span>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-xl border border-[rgba(38,51,47,0.28)] px-5 py-2 text-sm font-bold"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="rounded-xl bg-[#26332F] px-6 py-2 text-sm font-bold text-white"
              >
                저장
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold">저장했어요</h2>
            <p className="mt-1 text-sm text-[#5C6B66]">
              내 코스에서 확인할 수 있어요.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-xl border border-[rgba(38,51,47,0.28)] px-5 py-2 text-sm font-bold"
              >
                닫기
              </button>
              <Link
                href="/my"
                className="rounded-xl bg-[#26332F] px-6 py-2 text-sm font-bold text-white"
              >
                내 코스 보기
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
