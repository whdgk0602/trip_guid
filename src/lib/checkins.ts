export type Checkin = {
  spotId: string;
  note: string;
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
): Checkin[] {
  const withoutSpot = checkins.filter((c) => c.spotId !== spotId);
  return [...withoutSpot, { spotId, note }];
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
