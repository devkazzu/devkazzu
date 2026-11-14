import "dotenv/config";
import { ensureData } from "../src/lib/data";
import { pool } from "../src/db";
ensureData().then(() => console.log("DEVKAZZU content is ready. Seeding is idempotent; existing edits are preserved.")).catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => pool.end());
