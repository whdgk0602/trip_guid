/**
 * LLM 없이 쓰는 비상용 지명 추출기.
 * OpenRouter 무료 한도가 다 찼거나 키가 없을 때 쓴다 — 정확도는 LLM보다 낮지만
 * "OO역/OO동/OO공원" 형태의 흔한 경로 서술은 대부분 잡는다.
 * 모호한 이름("한강공원")은 지오코딩 단계의 근접 보정이 일부 보완한다.
 */

const MAX_PLACES = 5;

/** 지명으로 끝나는 접미사 — 앞에 최소 1글자가 있어야 함 ("길", "공원" 단독은 제외) */
const PLACE_PATTERN =
  /^.+(역|동|동\d+가|공원|숲|길|거리|시장|궁|천|산|광장|타워|해변|해수욕장|호수|대교|마을|골목)$/;

/** 접미사는 맞지만 장소가 아닌 흔한 단어 */
const STOP_WORDS = new Set([
  "출근길", "퇴근길", "산책길", "등굣길", "하굣길", "귀갓길", "가는길", "오는길",
  "운동", "이동", "활동", "행동", "자동", "등산", "하산", "출산", "생산",
  "지역", "구역", "역", "길거리",
]);

/** 뒤에 붙는 조사·어미 — 긴 것부터 */
const PARTICLES = [
  "에서부터", "으로부터", "이에요", "에서", "까지", "부터", "으로", "이랑", "하고",
  "에게", "한테", "처럼", "예요", "에요", "이요",
  "로", "을", "를", "이", "가", "은", "는", "에", "의", "와", "과", "도", "만", "랑",
];

function isPlace(token: string): boolean {
  return PLACE_PATTERN.test(token) && !STOP_WORDS.has(token) && !/^\d/.test(token);
}

function toPlaceName(token: string): string | null {
  if (isPlace(token)) return token;
  for (const particle of PARTICLES) {
    if (token.length > particle.length && token.endsWith(particle)) {
      const stem = token.slice(0, -particle.length);
      if (isPlace(stem)) return stem;
    }
  }
  return null;
}

export function ruleBasedPlaceNames(text: string): string[] {
  const names = text
    .split(/[\s,.!?~·→()[\]"'“”‘’-]+/)
    .filter(Boolean)
    .map(toPlaceName)
    .filter((name): name is string => name !== null);

  return [...new Set(names)].slice(0, MAX_PLACES);
}
