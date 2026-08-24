import { describe, expect, test } from "vitest";
import {
  addSavedRoute,
  filterRoutesByVisibility,
  loadSavedRoutes,
  persistSavedRoutes,
  setSavedRouteVisibility,
} from "./savedRoutes";

const course = {
  title: "강남역 골목 산책",
  intro: "퇴근길에 만나는...",
  spots: [
    {
      id: "spot-1",
      name: "대림 커피",
      category: "카페",
      description: "조용한 카페",
      address: "서울 영등포구",
    },
  ],
};

function createFakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe("addSavedRoute", () => {
  test("appends a new route with the given visibility", () => {
    const result = addSavedRoute([], course, "public");

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe(course.title);
    expect(result[0].visibility).toBe("public");
    expect(result[0].id).toBeTruthy();
  });

  test("keeps existing routes and adds the new one after them", () => {
    const existing = addSavedRoute([], course, "private");

    const result = addSavedRoute(existing, course, "public");

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(existing[0]);
    expect(result[1].visibility).toBe("public");
  });
});

describe("setSavedRouteVisibility", () => {
  test("flips the visibility of the matching route", () => {
    const routes = addSavedRoute([], course, "private");

    const result = setSavedRouteVisibility(routes, routes[0].id, "public");

    expect(result[0].visibility).toBe("public");
  });

  test("leaves other routes untouched", () => {
    const routes = addSavedRoute(
      addSavedRoute([], course, "private"),
      course,
      "private",
    );

    const result = setSavedRouteVisibility(routes, routes[0].id, "public");

    expect(result[1].visibility).toBe("private");
  });
});

describe("filterRoutesByVisibility", () => {
  test("returns all routes when filter is 'all'", () => {
    const routes = addSavedRoute(
      addSavedRoute([], course, "public"),
      course,
      "private",
    );

    expect(filterRoutesByVisibility(routes, "all")).toEqual(routes);
  });

  test("returns only public routes when filter is 'public'", () => {
    const routes = addSavedRoute(
      addSavedRoute([], course, "public"),
      course,
      "private",
    );

    const result = filterRoutesByVisibility(routes, "public");

    expect(result).toHaveLength(1);
    expect(result[0].visibility).toBe("public");
  });

  test("returns only private routes when filter is 'private'", () => {
    const routes = addSavedRoute(
      addSavedRoute([], course, "public"),
      course,
      "private",
    );

    const result = filterRoutesByVisibility(routes, "private");

    expect(result).toHaveLength(1);
    expect(result[0].visibility).toBe("private");
  });

  test("returns an empty array when no routes match the filter", () => {
    const routes = addSavedRoute([], course, "public");

    expect(filterRoutesByVisibility(routes, "private")).toEqual([]);
  });
});

describe("loadSavedRoutes", () => {
  test("returns an empty array when nothing is stored", () => {
    const storage = createFakeStorage();

    expect(loadSavedRoutes(storage, "anon-1")).toEqual([]);
  });

  test("returns the routes previously persisted for that anonymousId", () => {
    const storage = createFakeStorage();
    const routes = addSavedRoute([], course, "public");

    persistSavedRoutes(storage, "anon-1", routes);

    expect(loadSavedRoutes(storage, "anon-1")).toEqual(routes);
  });
});
