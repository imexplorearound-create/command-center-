import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: [
      "lib/**/*.test.ts",
      "lib/**/__tests__/**/*.test.ts",
      "app/**/__tests__/**/*.test.{ts,tsx}",
      "components/**/__tests__/**/*.test.{ts,tsx}",
    ],
    // Ficheiros de componente declaram jsdom via pragma
    // `// @vitest-environment jsdom` no topo. Vitest 4 deprecou
    // `environmentMatchGlobs` — com 2 component tests apenas, a pragma
    // é mais leve do que migrar para o novo API de `projects`.
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
