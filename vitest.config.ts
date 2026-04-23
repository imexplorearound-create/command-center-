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
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
