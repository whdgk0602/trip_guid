import { describe, expect, test } from "vitest";
import { POST } from "./route";

describe("POST /api/routes/generate", () => {
  test("returns a course JSON matching the schema, with 3 spots", async () => {
    const request = new Request("http://localhost/api/routes/generate", {
      method: "POST",
      body: JSON.stringify({ text: "출근길에 대림역에서 2호선 갈아타고 강남역에서 내려요" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(typeof body.title).toBe("string");
    expect(typeof body.intro).toBe("string");
    expect(body.spots).toHaveLength(3);
    for (const spot of body.spots) {
      expect(typeof spot.id).toBe("string");
      expect(typeof spot.name).toBe("string");
      expect(typeof spot.category).toBe("string");
      expect(typeof spot.description).toBe("string");
      expect(typeof spot.address).toBe("string");
    }
  });
});
