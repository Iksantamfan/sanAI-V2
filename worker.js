const SYSTEM_PROMPT = `You are San AI, a helpful personal AI assistant. Be clear, accurate, practical, and natural. Reply in the user's language. If unsure, say so instead of inventing facts.`;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8" }
});

async function callRouter(env, messages) {
  if (!env.XYRUS_API_KEY || !env.XYRUS_BASE_URL || !env.XYRUS_MODEL) {
    throw new Error("API belum dikonfigurasi. Isi XYRUS_API_KEY, XYRUS_BASE_URL, dan XYRUS_MODEL di Worker Settings.");
  }
  const base = env.XYRUS_BASE_URL.replace(/\/+$/, "");
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${env.XYRUS_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: env.XYRUS_MODEL, messages, temperature: 0.7 })
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = { raw }; }
  if (!response.ok) throw new Error(data?.error?.message || data?.message || `Provider returned HTTP ${response.status}`);
  const answer = data?.choices?.[0]?.message?.content;
  if (typeof answer !== "string" || !answer.trim()) throw new Error("Format respons provider tidak dikenali. Periksa format API Xyrus Router.");
  return answer.trim();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: {
      "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "Content-Type"
    }});
    if (url.pathname === "/api/health") return json({ ok: true, app: "San AI" });
    if (url.pathname === "/api/history" && request.method === "GET") {
      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId) return json({ error: "sessionId wajib diisi" }, 400);
      const { results } = await env.DB.prepare(
        "SELECT role, content, created_at FROM messages WHERE session_id = ? ORDER BY id DESC LIMIT 60"
      ).bind(sessionId).all();
      return json({ messages: (results || []).reverse() });
    }
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const body = await request.json();
        const sessionId = String(body.sessionId || "").slice(0, 100);
        const userText = String(body.message || "").trim();
        if (!sessionId || !userText) return json({ error: "sessionId dan message wajib diisi" }, 400);
        if (userText.length > 12000) return json({ error: "Pesan terlalu panjang (maksimal 12.000 karakter)." }, 400);
        await env.DB.prepare("INSERT INTO messages (session_id, role, content) VALUES (?, 'user', ?)")
          .bind(sessionId, userText).run();
        const { results } = await env.DB.prepare(
          "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id DESC LIMIT 20"
        ).bind(sessionId).all();
        const context = (results || []).reverse().map(m => ({ role: m.role, content: m.content }));
        const answer = await callRouter(env, [{ role: "system", content: SYSTEM_PROMPT }, ...context]);
        await env.DB.prepare("INSERT INTO messages (session_id, role, content) VALUES (?, 'assistant', ?)")
          .bind(sessionId, answer).run();
        return json({ answer });
      } catch (error) {
        return json({ error: error?.message || "Terjadi kesalahan pada server." }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  }
};
