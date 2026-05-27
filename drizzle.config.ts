import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ path: ".env.local" });
loadEnv();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for drizzle-kit.");
}

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
