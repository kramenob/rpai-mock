const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();

app.use(bodyParser.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDb() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS vector;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      content TEXT,
      embedding vector(8)
    );
  `);
}

initDb().catch(err => {
  console.error("DB init error:", err);
});

function embed(text) {
  // Simple deterministic fake embedding (for load testing realism)
  const vec = new Array(8).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[i % 8] += text.charCodeAt(i) / 100;
  }
  return vec;
}

app.post("/chat", async (req, res) => {
  const { message } = req.body;

  // 1. REAL RAG (pgvector)
  const ragStart = Date.now();

  const queryEmbedding = embed(message);

  let ragResult = [];
  try {
    const result = await pool.query(
      `
      SELECT content
      FROM documents
      ORDER BY embedding <-> $1
      LIMIT 3
      `,
      [queryEmbedding]
    );

    ragResult = result.rows;
  } catch (e) {
    console.error("RAG query error:", e);
  }

  const ragMs = Date.now() - ragStart;

  // 2. LLM (LLM-compatible endpoint)
  const llmStart = Date.now();

  let llmText = "";

  try {
    const llmResponse = await fetch(
      `${process.env.LLM_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.LLM_API_KEY || ""}`,
        },
        body: JSON.stringify({
          model: process.env.LLM_MODEL || "",
          messages: [
            {
              role: "system",
              content:
                "You are a medical assistant for reproductive health clinic. Use provided RAG context.",
            },
            {
              role: "user",
              content: message,
            },
            {
              role: "assistant",
              content: `RAG context: ${JSON.stringify(ragResult || [])}`,
            },
          ],
          temperature: 0.3,
        }),
      }
    );

    const data = await llmResponse.json();
    llmText =
      data?.choices?.[0]?.message?.content ||
      "No response from LLM";
  } catch (err) {
    console.error("LLM request failed:", err);
    llmText = "LLM error";
  }

  const llmMs = Date.now() - llmStart;

  // 3. CRM logic (mock)
  // ... some CRM logic here ...

  res.json({
    response: llmText,
    rag_context: ragResult,
    rag_time_ms: ragMs,
  });
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
