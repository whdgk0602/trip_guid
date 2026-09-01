"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getOrCreateAnonymousId } from "@/lib/anonymousId";
import { getTier, setTier, type Tier } from "@/lib/tier";

type Phase = "compare" | "payment" | "complete";

const COMPARISON_ROWS: { label: string; free: string; premium: string }[] = [
  { label: "코스 생성", free: "무제한", premium: "무제한" },
  { label: "코스당 스팟 개수", free: "3개", premium: "5개" },
  { label: "공유 카드", free: "워터마크 포함", premium: "워터마크 없음" },
  { label: "체크인 + AI 여행기", free: "잠금", premium: "이용 가능" },
];

export default function PlanPage() {
  const [anonymousId, setAnonymousId] = useState("");
  const [tier, setTierState] = useState<Tier>("free");
  const [phase, setPhase] = useState<Phase>("compare");

  useEffect(() => {
    const id = getOrCreateAnonymousId(localStorage);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnonymousId(id);
    setTierState(getTier(localStorage, id));
  }, []);

  function handlePay() {
    setTier(localStorage, anonymousId, "premium");
    setTierState("premium");
    setPhase("complete");
  }

  function handleRevertToFree() {
    setTier(localStorage, anonymousId, "free");
    setTierState("free");
    setPhase("compare");
  }

  if (phase === "payment") {
    return (
      <div className="flex min-h-screen flex-col bg-[#FDFDFB] text-[#26332F]">
        <header className="flex h-[76px] items-center justify-between border-b border-[rgba(38,51,47,0.1)] px-6 lg:px-14">
          <Link href="/" className="text-[17px] font-bold tracking-[-.008em]">
            동네 큐레이터
          </Link>
          <span className="text-[14.5px] text-[#5C6B66]">결제</span>
        </header>

        <main className="flex flex-1 flex-col items-center px-6 py-16 lg:px-0">
          <div className="flex w-full max-w-[720px] flex-col gap-7">
            <h1 className="text-[30px] font-bold tracking-[-.014em] lg:text-[36px]">
              프리미엄 결제
            </h1>

            <div className="flex flex-col gap-4 rounded-2xl border border-[rgba(38,51,47,0.14)] bg-white p-[26px]">
              <div className="flex items-center justify-between">
                <span className="text-[17px] font-bold">프리미엄 월간</span>
                <span className="font-archivo text-[22px] font-semibold">
                  4,900원
                </span>
              </div>
              <div className="h-px bg-[rgba(38,51,47,0.1)]" />
              <div className="flex justify-between text-[14.5px] text-[#5C6B66]">
                <span>결제 주기</span>
                <span>매월 23일</span>
              </div>
              <div className="flex justify-between text-[14.5px] text-[#5C6B66]">
                <span>해지</span>
                <span>언제든 가능</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-[14px] font-bold text-[#5C6B66]">
                결제 수단
              </span>
              <div className="flex gap-3">
                <label className="flex flex-1 cursor-pointer items-center gap-3.5 rounded-2xl border-[1.5px] border-[#26332F] bg-[rgba(38,51,47,0.04)] p-[18px]">
                  <input type="radio" name="payment-method" defaultChecked className="sr-only" />
                  <span className="box-border h-[18px] w-[18px] flex-none rounded-full border-[5px] border-[#26332F]" />
                  <span className="text-[15px] font-bold">신용 · 체크카드</span>
                </label>
                <label className="flex flex-1 cursor-pointer items-center gap-3.5 rounded-2xl border border-[rgba(38,51,47,0.2)] p-[18px]">
                  <input type="radio" name="payment-method" className="sr-only" />
                  <span className="box-border h-[18px] w-[18px] flex-none rounded-full border-[1.5px] border-[rgba(38,51,47,0.35)]" />
                  <span className="text-[15px] text-[#5C6B66]">간편결제</span>
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <input
                placeholder="카드번호"
                className="rounded-xl border border-[rgba(38,51,47,0.2)] px-[17px] py-[17px] text-[15px] placeholder:text-[#9BA8A3]"
              />
              <div className="flex gap-3">
                <input
                  placeholder="MM / YY"
                  className="flex-1 rounded-xl border border-[rgba(38,51,47,0.2)] px-[17px] py-[17px] text-[15px] placeholder:text-[#9BA8A3]"
                />
                <input
                  placeholder="CVC"
                  className="flex-1 rounded-xl border border-[rgba(38,51,47,0.2)] px-[17px] py-[17px] text-[15px] placeholder:text-[#9BA8A3]"
                />
              </div>
            </div>

            <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center">
              <button
                onClick={handlePay}
                className="rounded-[14px] bg-[#26332F] px-10 py-[18px] text-[16.5px] font-bold text-white"
              >
                4,900원 결제하기
              </button>
              <p className="rounded-[10px] bg-[rgba(232,98,60,0.1)] px-4 py-3 text-[13px] text-[#8A5B45]">
                데모 화면 · 입력값은 전송되지 않습니다
              </p>
            </div>

            <button
              onClick={() => setPhase("compare")}
              className="w-fit text-[14px] text-[#5C6B66] hover:text-[#E8623C]"
            >
              ← 뒤로
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FDFDFB] px-6 text-center text-[#26332F]">
        <div className="flex w-full max-w-[480px] flex-col items-center gap-4">
          <h1 className="text-[28px] font-bold tracking-[-.012em]">
            결제가 완료됐어요
          </h1>
          <p className="text-[15px] leading-[1.8] text-[#5C6B66]">
            프리미엄 등급으로 전환됐어요. 이제 스팟 5개, 워터마크 없는 공유
            카드, 체크인 + AI 여행기를 이용할 수 있어요.
          </p>
          <Link
            href="/"
            className="mt-2 rounded-[14px] bg-[#26332F] px-8 py-[15px] font-bold text-white"
          >
            코스 만들러 가기 →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFDFB] text-[#26332F]">
      <header className="flex h-[76px] items-center justify-between border-b border-[rgba(38,51,47,0.1)] px-6 lg:px-14">
        <Link href="/" className="text-[17px] font-bold tracking-[-.008em]">
          동네 큐레이터
        </Link>
        <div className="flex items-center gap-8 text-[14.5px] text-[#5C6B66]">
          <Link href="/gallery" className="hover:text-[#E8623C]">
            갤러리
          </Link>
          <Link href="/my" className="hover:text-[#E8623C]">
            내 코스
          </Link>
          <span className="rounded-full border border-[#26332F] px-[18px] py-[9px] font-bold text-[#26332F]">
            프리미엄
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 py-16 lg:px-0">
        <div className="flex w-full max-w-[860px] flex-col gap-9">
          <div className="flex flex-col items-center gap-3.5 text-center">
            <span className="font-archivo text-[12px] tracking-[.3em] text-[#E8623C] uppercase">
              Premium
            </span>
            <h1 className="text-[32px] leading-[1.24] font-bold tracking-[-.016em] lg:text-[44px]">
              코스를 끝까지 가지고 싶다면
            </h1>
            <p className="max-w-[560px] text-[15px] leading-[1.8] text-[#5C6B66] lg:text-[16px]">
              무료로도 코스는 계속 만들 수 있어요. 프리미엄은 더 많은 스팟과
              기록을 위한 등급입니다.
            </p>
            <p className="text-[13px] font-bold text-[#5C6B66]">
              현재 등급: {tier === "premium" ? "프리미엄" : "무료"}
            </p>
          </div>

          <div className="flex flex-col">
            <div className="grid grid-cols-[1.6fr_1fr_1fr] border-b border-[rgba(38,51,47,0.2)] pb-3.5 text-[13px] font-bold text-[#5C6B66]">
              <span />
              <span className="text-center">무료</span>
              <span className="text-center text-[#E8623C]">프리미엄</span>
            </div>
            {COMPARISON_ROWS.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-[1.6fr_1fr_1fr] items-center py-5 text-[15.5px] ${
                  i < COMPARISON_ROWS.length - 1
                    ? "border-b border-[rgba(38,51,47,0.1)]"
                    : ""
                }`}
              >
                <span className="font-medium">{row.label}</span>
                <span className="text-center text-[#5C6B66]">{row.free}</span>
                <span className="text-center font-bold">{row.premium}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-3.5">
            {tier === "premium" ? (
              <>
                <p className="text-[15px] font-bold text-[#2E6B4F]">
                  프리미엄 이용 중
                </p>
                <button
                  onClick={handleRevertToFree}
                  className="rounded-[14px] border border-[rgba(38,51,47,0.28)] px-8 py-[15px] text-[15px] font-bold"
                >
                  무료로 되돌리기
                </button>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="font-archivo text-[34px] font-semibold">
                    4,900
                  </span>
                  <span className="text-[15px] text-[#5C6B66]">원 / 월</span>
                </div>
                <button
                  onClick={() => setPhase("payment")}
                  className="rounded-[14px] bg-[#26332F] px-12 py-[18px] text-[16.5px] font-bold text-white"
                >
                  프리미엄 구매하기
                </button>
                <p className="text-[12.5px] text-[#8B9A94]">
                  포트폴리오 데모입니다. 실제 결제는 이루어지지 않습니다.
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
