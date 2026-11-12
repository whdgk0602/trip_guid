import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // tsconfig.json의 `@/*` → `./src/*` 별칭과 맞춤
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
