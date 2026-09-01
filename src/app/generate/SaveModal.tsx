"use client";

import Link from "next/link";
import { useState } from "react";
import type { Visibility } from "@/lib/savedRoutes";

type Phase = "choosing" | "saved";

const OPTIONS: { value: Visibility; title: string; desc: string }[] = [
  {
    value: "public",
    title: "공개",
    desc: "갤러리에 노출됩니다. 다른 사람이 이 코스를 둘러볼 수 있어요.",
  },
  {
    value: "private",
    title: "비공개",
    desc: "나만 볼 수 있어요. 내 코스에서만 확인됩니다.",
  },
];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(22,51,46,0.42)] p-4">
      <div className="w-full max-w-[560px] rounded-[20px] bg-[#FDFDFB] p-9 shadow-[0_30px_70px_rgba(22,51,46,0.3)]">
        {phase === "choosing" ? (
          <>
            <div className="flex flex-col gap-2">
              <h2 className="text-[26px] font-bold tracking-[-.008em] text-[#26332F]">
                이 코스를 저장할까요?
              </h2>
              <p className="text-[14.5px] text-[#5C6B66]">
                공개 여부는 저장 후에도 바꿀 수 있어요.
              </p>
            </div>

            <div className="mt-[22px] flex flex-col gap-3">
              {OPTIONS.map((option) => {
                const selected = visibility === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-4 rounded-[14px] p-5 ${
                      selected
                        ? "border-[1.5px] border-[#26332F] bg-[rgba(38,51,47,0.04)]"
                        : "border border-[rgba(38,51,47,0.2)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      checked={selected}
                      onChange={() => setVisibility(option.value)}
                      className="sr-only"
                    />
                    <span
                      className={`mt-0.5 box-border h-5 w-5 flex-none rounded-full ${
                        selected
                          ? "border-[6px] border-[#26332F]"
                          : "border-[1.5px] border-[rgba(38,51,47,0.35)]"
                      }`}
                    />
                    <span className="flex flex-col gap-[5px]">
                      <span className="text-[16px] font-bold text-[#26332F]">
                        {option.title}
                      </span>
                      <span className="text-[13.5px] leading-[1.7] text-[#5C6B66]">
                        {option.desc}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <p className="mt-[22px] rounded-xl bg-[rgba(232,98,60,0.08)] px-[17px] py-[15px] text-[13px] leading-[1.7] text-[#8A5B45]">
              로그인 없이 이 브라우저에 저장돼요. 브라우저 데이터를 지우거나
              기기를 바꾸면 코스에 접근할 수 없습니다.
            </p>

            <div className="mt-[22px] flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-[13px] border border-[rgba(38,51,47,0.28)] px-7 py-[15px] text-[15px] font-bold text-[#26332F]"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="rounded-[13px] bg-[#26332F] px-9 py-4 text-[15px] font-bold text-white"
              >
                저장
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-[26px] font-bold tracking-[-.008em] text-[#26332F]">
              저장했어요
            </h2>
            <p className="mt-2 text-[14.5px] text-[#5C6B66]">
              내 코스에서 확인할 수 있어요.
            </p>
            <div className="mt-[22px] flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-[13px] border border-[rgba(38,51,47,0.28)] px-7 py-[15px] text-[15px] font-bold text-[#26332F]"
              >
                닫기
              </button>
              <Link
                href="/my"
                className="rounded-[13px] bg-[#26332F] px-9 py-4 text-[15px] font-bold text-white"
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
