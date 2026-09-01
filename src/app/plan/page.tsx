"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getOrCreateAnonymousId } from "@/lib/anonymousId";
import { getTier, setTier, type Tier } from "@/lib/tier";

type Phase = "compare" | "payment" | "complete";

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

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFDFB] p-6 text-[#26332F]">
      <p className="text-[19px] font-bold">무료 / 프리미엄 등급</p>

      {phase === "payment" ? (
        <div className="mt-6 flex flex-col gap-4">
          <p className="font-bold">프리미엄 결제</p>
          <div className="rounded-[14px] border border-[rgba(38,51,47,0.14)] p-4">
            <p className="text-[14px] text-[#5C6B66]">월 4,900원</p>
            <p className="mt-3 text-[13px] font-bold">결제 수단</p>
            <div className="mt-2 flex flex-col gap-2">
              <label className="flex items-center gap-2 text-[13.5px]">
                <input type="radio" name="payment-method" defaultChecked />
                신용/체크카드
              </label>
              <label className="flex items-center gap-2 text-[13.5px]">
                <input type="radio" name="payment-method" />
                간편결제
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setPhase("compare")}
              className="rounded-xl border border-[rgba(38,51,47,0.28)] px-5 py-2 text-sm font-bold"
            >
              취소
            </button>
            <button
              onClick={handlePay}
              className="rounded-xl bg-[#26332F] px-6 py-2 text-sm font-bold text-white"
            >
              결제하기
            </button>
          </div>
        </div>
      ) : phase === "complete" ? (
        <div className="mt-6 flex flex-col gap-4">
          <p className="font-bold">결제가 완료됐어요</p>
          <p className="text-[14px] text-[#5C6B66]">
            프리미엄 등급으로 전환됐어요. 이제 스팟 5개, 워터마크 없는 공유
            카드를 이용할 수 있어요.
          </p>
          <p>
            <Link href="/" className="font-bold">
              코스 만들러 가기 →
            </Link>
          </p>
        </div>
      ) : (
        <>
          <p className="mt-1 text-[13px] text-[#5C6B66]">
            현재 등급: {tier === "premium" ? "프리미엄" : "무료"}
          </p>

          <table className="mt-6 w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-[rgba(38,51,47,0.14)] text-left">
                <th className="py-2">구분</th>
                <th className="py-2">무료</th>
                <th className="py-2">프리미엄</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[rgba(38,51,47,0.08)]">
                <td className="py-2 text-[#5C6B66]">스팟 개수</td>
                <td className="py-2">3개</td>
                <td className="py-2">5개</td>
              </tr>
              <tr className="border-b border-[rgba(38,51,47,0.08)]">
                <td className="py-2 text-[#5C6B66]">공유 카드 워터마크</td>
                <td className="py-2">포함</td>
                <td className="py-2">없음</td>
              </tr>
              <tr>
                <td className="py-2 text-[#5C6B66]">체크인 + AI 여행기</td>
                <td className="py-2">잠금</td>
                <td className="py-2">이용 가능</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-6">
            {tier === "premium" ? (
              <div className="flex flex-col gap-3">
                <p className="text-[14px] font-bold text-[#2E6B4F]">
                  프리미엄 이용 중
                </p>
                <button
                  onClick={handleRevertToFree}
                  className="w-fit rounded-xl border border-[rgba(38,51,47,0.28)] px-5 py-2 text-sm font-bold"
                >
                  무료로 되돌리기
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPhase("payment")}
                className="rounded-xl bg-[#26332F] px-6 py-2 text-sm font-bold text-white"
              >
                프리미엄 구매하기
              </button>
            )}
          </div>
        </>
      )}

      <p className="mt-8">
        <Link href="/">경로 입력하러 가기</Link>
      </p>
    </div>
  );
}
