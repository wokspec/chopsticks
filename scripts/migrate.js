import "dotenv/config";
import { ensureSchema } from "../src/utils/storage_pg.js";

try {
  await ensureSchema();
  console.log("✅ Postgres schema ensured.");
} catch (err) {
  console.error("❌ Migration failed:", err?.message ?? err);
  process.exitCode = 1;
}
