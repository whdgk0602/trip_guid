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
    <div className="flex min-h-screen flex-col bg-[#FDFDFB] text-[#26332F]">
      <header className="flex h-[76px] items-center justify-between border-b border-[rgba(38,51,47,0.1)] px-6 lg:px-14">
        <span className="text-[17px] font-bold tracking-[-.008em]">동네 큐레이터</span>
        <div className="flex items-center gap-4">
          <Link href="/gallery" className="text-[14.5px] font-bold">
            갤러리
          </Link>
          <Link href="/plan" className="text-[14.5px] font-bold">
            등급
          </Link>
          <Link href="/my" className="text-[14.5px] font-bold">
            내 코스
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 pt-11 lg:px-0 lg:pt-[92px]">
        <div className="flex w-full max-w-[720px] flex-col gap-6">
          <div className="font-archivo text-[12px] uppercase tracking-[.3em] text-[#E8623C]">
            Your everyday route
          </div>
          <h1 className="text-[34px] leading-[1.24] font-bold tracking-[-.012em] lg:text-[60px] lg:leading-[1.14] lg:tracking-[-.016em]">
            당신의 출퇴근길은
            <br />
            누군가의 여행지입니다
          </h1>
          <p className="max-w-[560px] text-[14.5px] leading-[1.75] text-[#5C6B66] lg:text-[17px] lg:leading-[1.8]">
            매일 지나는 길을 한 문장으로 적어주세요. AI가 주변 장소를 골라
            로컬 코스로 만들어 드립니다.
          </p>

          <div
            className={`mt-2 flex min-h-[132px] flex-col gap-3.5 rounded-[14px] border bg-white p-[18px] pb-3 lg:p-[22px] lg:pb-4 ${
              error ? "border-[1.5px] border-[#D24B3E]" : "border-[rgba(38,51,47,0.2)]"
            }`}
          >
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="출근길에 대림역에서 2호선 갈아타고 강남역에서 내려요"
              rows={2}
              className="flex-1 resize-none bg-transparent text-[14.5px] leading-[1.7] text-[#26332F] placeholder:text-[#9BA8A3] focus:outline-none lg:text-[17px]"
            />
            <div className="mt-auto flex items-center justify-between">
              <span
                className={`text-[12px] lg:text-[13px] ${
                  error ? "font-bold text-[#D24B3E]" : "text-[#8D9A95]"
                }`}
              >
                {error || "10자 이상 300자 이하로 적어주세요"}
              </span>
              <span
                className={`font-archivo text-[12.5px] lg:text-[13px] ${
                  error ? "text-[#D24B3E]" : "text-[#8D9A95]"
                }`}
              >
                {value.length} / 300
              </span>
            </div>
          </div>

          <div className="flex items-center gap-[18px]">
            <button
              onClick={handleSubmit}
              className="rounded-[14px] bg-[#26332F] px-10 py-[18px] text-[16px] font-bold text-[#F2FAF6] lg:text-[16.5px]"
            >
              코스 만들기
            </button>
            <span className="hidden text-[14px] text-[#8D9A95] lg:inline">
              보통 10초 안에 완성돼요
            </span>
          </div>
        </div>

        <div className="mt-auto w-full border-t border-[rgba(38,51,47,0.1)] px-6 py-6 lg:px-14 lg:py-[26px]">
          <div className="flex items-center justify-between text-[13px] lg:text-[14px]">
            <span className="text-[#5C6B66]">내가 만든 코스가 궁금하다면</span>
            <Link href="/my" className="font-bold">
              내 코스 보기 →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
