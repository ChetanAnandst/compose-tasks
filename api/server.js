const fs = require("node:fs/promises");
const path = require("node:path");
const express = require("express");
const { Pool } = require("pg");

const app = express();
const port = Number(process.env.PORT || 3000);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (error) {
    console.error("Health check failed:", error.message);
    res.status(503).json({ error: "Database unavailable" });
  }
});

app.get("/api/tasks", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, title, completed, created_at FROM tasks ORDER BY created_at DESC, id DESC",
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post("/api/tasks", async (req, res, next) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  if (title.length === 0 || title.length > 200) {
    return res.status(400).json({ error: "Task title must be between 1 and 200 characters" });
  }

  try {
    const { rows } = await pool.query(
      "INSERT INTO tasks (title) VALUES ($1) RETURNING id, title, completed, created_at",
      [title],
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/tasks/:id", async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id) || typeof req.body?.completed !== "boolean") {
    return res.status(400).json({ error: "Provide a valid task ID and completed boolean" });
  }

  try {
    const { rows } = await pool.query(
      "UPDATE tasks SET completed = $1 WHERE id = $2 RETURNING id, title, completed, created_at",
      [req.body.completed, req.params.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/tasks/:id", async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: "Provide a valid task ID" });
  }

  try {
    const { rowCount } = await pool.query("DELETE FROM tasks WHERE id = $1", [req.params.id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const status =
    Number.isInteger(error.status) && error.status >= 400 && error.status < 500
      ? error.status
      : 500;
  if (status === 500) {
    console.error("Request failed:", error.message);
  }
  res.status(status).json({
    error: status === 400 ? "Invalid request" : status === 413 ? "Request body too large" : "Internal server error",
  });
});

async function start() {
  const schema = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);
  app.listen(port, "0.0.0.0", () => {
    console.log(`Task API listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error("Could not start API:", error.message);
  process.exitCode = 1;
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await pool.end();
    process.exit(0);
  });
}
