export type Checkin = {
  spotId: string;
  note: string;
  /** 줄인 JPEG data URL (브라우저에만 저장). 저장 공간이 부족하면 빠질 수 있음 */
  photo?: string;
};

type Spot = {
  id: string;
  name: string;
};

type CheckinStorage = Pick<Storage, "getItem" | "setItem">;

function checkinsKey(anonymousId: string, routeId: string): string {
  return `checkins:${anonymousId}:${routeId}`;
}

function travelogueKey(anonymousId: string, routeId: string): string {
  return `travelogue:${anonymousId}:${routeId}`;
}

export function addCheckin(
  checkins: Checkin[],
  spotId: string,
  note: string,
  photo?: string,
): Checkin[] {
  const withoutSpot = checkins.filter((c) => c.spotId !== spotId);
  return [...withoutSpot, photo ? { spotId, note, photo } : { spotId, note }];
}

export function isRouteComplete(spots: Spot[], checkins: Checkin[]): boolean {
  return spots.every((spot) =>
    checkins.some((checkin) => checkin.spotId === spot.id),
  );
}

export function buildTravelogue(
  courseTitle: string,
  spots: Spot[],
  checkins: Checkin[],
): string {
  const intro = `${courseTitle}, 그 하루의 기록을 시작한다.`;

  const body = spots
    .map((spot) => {
      const checkin = checkins.find((c) => c.spotId === spot.id);
      if (!checkin) return null;
      return `${spot.name}에서는 '${checkin.note}'라는 순간을 남겼다.`;
    })
    .filter((sentence): sentence is string => sentence !== null)
    .join(" ");

  const conclusion = `이렇게 ${spots.length}개의 장소를 거치며 오늘의 코스를 완주했다.`;

  return [intro, body, conclusion].join("\n\n");
}

export function loadCheckins(
  storage: Pick<CheckinStorage, "getItem">,
  anonymousId: string,
  routeId: string,
): Checkin[] {
  const raw = storage.getItem(checkinsKey(anonymousId, routeId));
  if (!raw) {
    return [];
  }
  return JSON.parse(raw) as Checkin[];
}

export function persistCheckins(
  storage: Pick<CheckinStorage, "setItem">,
  anonymousId: string,
  routeId: string,
  checkins: Checkin[],
): void {
  storage.setItem(checkinsKey(anonymousId, routeId), JSON.stringify(checkins));
}

/**
 * 사진 포함 저장을 시도하고, localStorage 용량(보통 5MB)이 부족하면 방금 추가한 스팟의 사진만 빼고 다시 저장.
 * 실제로 저장된 체크인 목록과 사진을 뺐는지 여부를 돌려준다.
 */
export function persistCheckinsWithPhotoFallback(
  storage: Pick<CheckinStorage, "setItem">,
  anonymousId: string,
  routeId: string,
  checkins: Checkin[],
  latestSpotId: string,
): { saved: Checkin[]; photoDropped: boolean } {
  try {
    persistCheckins(storage, anonymousId, routeId, checkins);
    return { saved: checkins, photoDropped: false };
  } catch {
    const withoutPhoto = checkins.map((c) =>
      c.spotId === latestSpotId ? { spotId: c.spotId, note: c.note } : c,
    );
    persistCheckins(storage, anonymousId, routeId, withoutPhoto);
    return { saved: withoutPhoto, photoDropped: true };
  }
}

export function loadTravelogue(
  storage: Pick<CheckinStorage, "getItem">,
  anonymousId: string,
  routeId: string,
): string | null {
  return storage.getItem(travelogueKey(anonymousId, routeId));
}

export function persistTravelogue(
  storage: Pick<CheckinStorage, "setItem">,
  anonymousId: string,
  routeId: string,
  text: string,
): void {
  storage.setItem(travelogueKey(anonymousId, routeId), text);
}
