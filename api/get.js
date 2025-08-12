// /api/get.js
export default async function handler(req, res) {
  const send = (code, obj) => {
    res.status(code)
      .setHeader('Content-Type', 'application/json')
      .setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(obj));
  };

  if (req.method !== 'GET') return send(405, { error: 'Method not allowed' });

  try {
    const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
    if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
      return send(500, { error: 'Missing KV env vars' });
    }

    const id = (req.query.r || req.query.id || '').toString().trim();
    if (!/^[a-z0-9]{6,12}$/i.test(id)) return send(400, { error: 'Bad id' });

    const key = `ai-face:${id}`;
    const r = await fetch(`${KV_REST_API_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
    });

    const text = await r.text();
    if (!r.ok) {
      let err = text; try { err = JSON.parse(text)?.error || err; } catch {}
      return send(500, { error: `KV get failed: ${err}` });
    }

    if (text === 'null' || text === '') return send(404, { error: 'Not found' });

    let data = text;
    try { data = JSON.parse(text); } catch {/* 저장이 문자열인 경우 그대로 반환 */}
    return send(200, { ok: true, data });
  } catch (e) {
    return send(500, { error: e?.message || 'Unexpected server error' });
  }
}
