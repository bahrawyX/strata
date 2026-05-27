import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    css: false,
    // The Strata Schema component imports framer-motion which ships heavy ESM;
    // tests don't render it so include patterns keep the test scope tight.
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./") },
  },
  define: {
    // Provide deterministic env values during tests so modules that read
    // them at import-time (lib/db.ts, lib/auth.ts, lib/crypto.ts) don't
    // throw. These never connect to anything real — they only have to be
    // syntactically valid.
    "process.env.DATABASE_URL": JSON.stringify(
      "postgresql://test:test@localhost:5432/test"
    ),
    "process.env.BETTER_AUTH_SECRET": JSON.stringify(
      "0".repeat(63) + "1"
    ),
    "process.env.BETTER_AUTH_URL": JSON.stringify("http://localhost:3000"),
    "process.env.NEXT_PUBLIC_APP_URL": JSON.stringify(
      "http://localhost:3000"
    ),
    "process.env.ENCRYPTION_KEY": JSON.stringify("0".repeat(63) + "1"),
  },
});
