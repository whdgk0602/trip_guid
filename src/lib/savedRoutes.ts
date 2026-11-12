type Spot = {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
};

type Course = {
  title: string;
  intro: string;
  spots: Spot[];
  /** 생성 API의 서버 서명 — 갤러리 게시에 필요 (서명 도입 전 저장분에는 없음) */
  signature?: string;
};

export type Visibility = "public" | "private";

export type SavedRoute = Course & {
  id: string;
  visibility: Visibility;
  createdAt: string;
};

type RoutesStorage = Pick<Storage, "getItem" | "setItem">;

function savedRoutesKey(anonymousId: string): string {
  return `routes:${anonymousId}`;
}

export function addSavedRoute(
  routes: SavedRoute[],
  course: Course,
  visibility: Visibility,
): SavedRoute[] {
  const newRoute: SavedRoute = {
    ...course,
    id: crypto.randomUUID(),
    visibility,
    createdAt: new Date().toISOString(),
  };
  return [...routes, newRoute];
}

export function setSavedRouteVisibility(
  routes: SavedRoute[],
  id: string,
  visibility: Visibility,
): SavedRoute[] {
  return routes.map((route) =>
    route.id === id ? { ...route, visibility } : route,
  );
}

export type VisibilityFilter = "all" | Visibility;

export function filterRoutesByVisibility(
  routes: SavedRoute[],
  filter: VisibilityFilter,
): SavedRoute[] {
  if (filter === "all") {
    return routes;
  }
  return routes.filter((route) => route.visibility === filter);
}

export function sortRoutesByNewest(routes: SavedRoute[]): SavedRoute[] {
  return [...routes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function loadSavedRoutes(
  storage: Pick<RoutesStorage, "getItem">,
  anonymousId: string,
): SavedRoute[] {
  const raw = storage.getItem(savedRoutesKey(anonymousId));
  if (!raw) {
    return [];
  }
  return JSON.parse(raw) as SavedRoute[];
}

export function persistSavedRoutes(
  storage: Pick<RoutesStorage, "setItem">,
  anonymousId: string,
  routes: SavedRoute[],
): void {
  storage.setItem(savedRoutesKey(anonymousId), JSON.stringify(routes));
}
