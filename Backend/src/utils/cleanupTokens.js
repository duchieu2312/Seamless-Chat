import cron from "node-cron";
import pool from "../config/db.js";

export function startTokenCleanupJob() {
  cron.schedule(
    "0 3 * * *",
    async () => {
      try {
        const result = await pool.query(
          "DELETE FROM refresh_tokens WHERE expires_at < NOW()",
        );
        console.log(`[Cron] Deleted ${result.rowCount} expired refresh tokens`);
      } catch (err) {
        console.error("[Cron] Error cleaning tokens:", err.message);
      }
    },
    {
      timezone: "Asia/Ho_Chi_Minh",
    },
  );

  console.log("[Cron] Token cleanup job scheduled");
}
