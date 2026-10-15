import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    // Paket ESM ini memakai import relatif tanpa ekstensi; harus di-inline agar Vite yang me-resolve.
    server: { deps: { inline: ["@cadit-app/potrace-ts"] } },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
