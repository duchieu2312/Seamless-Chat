import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.on("connect", () => {
  console.log("PostgreSQL Connected Seamless-Chat DB");
});

pool.on("error", (err) => {
  console.error("PostgreSQL Encounter Error:", err.message);
});

export default pool;
