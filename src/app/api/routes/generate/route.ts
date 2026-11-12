import { extractPlaceNames } from "@/lib/server/extractPlaceNames";
import { geocodePlace } from "@/lib/server/kakao";
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
    const kakaoKey = requireEnv("KAKAO_REST_API_KEY");
    const llm = {
      apiKey: requireEnv("OPENROUTER_API_KEY"),
      models: parseModelList(requireEnv("OPENROUTER_MODEL")),
    };
    return resolveRoutePlaces(text, {
      extractPlaceNames: (input) => extractPlaceNames(input, llm),
      geocode: (name) => geocodePlace(name, { apiKey: kakaoKey }),
    });
  },
});
