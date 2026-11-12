import { createHmac, timingSafeEqual } from "node:crypto";
import type { Spot } from "./buildCourse";

export type SignableCourse = { title: string; intro: string; spots: Spot[] };

/** 서명 대상 — 필드 순서를 고정해 클라이언트가 저장했다 돌려보내도 같은 문자열이 되게 */
function canonical(course: SignableCourse): string {
  return JSON.stringify({
    title: course.title,
    intro: course.intro,
    spots: course.spots.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      description: s.description,
      address: s.address,
    })),
  });
}

/**
 * 생성 API가 만든 코스에 붙이는 HMAC 서명.
 * 갤러리 게시 시 검증해서 "우리 서버가 생성한 내용"만 공개 갤러리에 올라가게 한다.
 */
export function signCourse(course: SignableCourse, secret: string): string {
  return createHmac("sha256", secret).update(canonical(course)).digest("hex");
}

export function verifyCourse(
  course: SignableCourse,
  signature: string,
  secret: string,
): boolean {
  const expected = Buffer.from(signCourse(course, secret), "hex");
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
