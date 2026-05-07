const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_KEY = process.env.ADMIN_KEY || "";
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "https://gosummit.ai,https://www.gosummit.ai")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.PGSSL_DISABLE === "true" ? false : { rejectUnauthorized: false }
});

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || CORS_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    }
  })
);

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS registrations (
      id BIGSERIAL PRIMARY KEY,
      city TEXT NOT NULL,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      email TEXT NOT NULL,
      company_type TEXT NOT NULL,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function sanitize(value) {
  return String(value || "").trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

app.post("/api/register", async (req, res) => {
  const city = sanitize(req.body.city);
  const name = sanitize(req.body.name);
  const title = sanitize(req.body.title);
  const company = sanitize(req.body.company);
  const email = sanitize(req.body.email).toLowerCase();
  const companyType = sanitize(req.body.companyType);

  if (!city || !name || !title || !company || !email || !companyType) {
    return res.status(400).json({ ok: false, message: "Missing required fields." });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, message: "Invalid email address." });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO registrations (city, name, title, company, email, company_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, submitted_at
      `,
      [city, name, title, company, email, companyType]
    );

    return res.json({
      ok: true,
      id: result.rows[0].id,
      submittedAt: result.rows[0].submitted_at
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Database insert failed." });
  }
});

app.get("/api/registrations", async (req, res) => {
  const key = String(req.query.key || req.headers["x-admin-key"] || "");
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return res.status(401).json({ ok: false, message: "Unauthorized." });
  }

  const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 500);
  try {
    const result = await pool.query(
      `
      SELECT id, city, name, title, company, email, company_type AS "companyType", submitted_at AS "submittedAt"
      FROM registrations
      ORDER BY id DESC
      LIMIT $1
      `,
      [limit]
    );
    return res.json({ ok: true, items: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Query failed." });
  }
});

ensureTable()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`GO Summit API listening on ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
