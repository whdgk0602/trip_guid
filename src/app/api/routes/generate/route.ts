import { buildSpots } from "@/lib/server/buildCourse";
import { extractPlaceNames } from "@/lib/server/extractPlaceNames";
import { geocodePlace, searchNearbyCandidates } from "@/lib/server/kakao";
import { parseModelList, UpstreamError } from "@/lib/server/llm";
import { resolveRoutePlaces } from "@/lib/server/resolveRoutePlaces";
import { createGenerateHandler } from "./handler";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new UpstreamError(`missing env ${name}`);
  return value;
}

export const POST = createGenerateHandler({
  resolvePlaces: (text) => {
    const kakao = { apiKey: requireEnv("KAKAO_REST_API_KEY") };
    const llm = {
      apiKey: requireEnv("OPENROUTER_API_KEY"),
      models: parseModelList(requireEnv("OPENROUTER_MODEL")),
    };
    return resolveRoutePlaces(text, {
      extractPlaceNames: (input) => extractPlaceNames(input, llm),
      geocode: (name, near) => geocodePlace(name, kakao, near),
    });
  },
  buildSpots: (places, count) => {
    const kakao = { apiKey: requireEnv("KAKAO_REST_API_KEY") };
    return buildSpots(places, count, {
      search: (anchors, radius) => searchNearbyCandidates(anchors, radius, kakao),
    });
  },
});
