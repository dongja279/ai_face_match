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
      return send(500, { error: 'Missing KV env vars (KV_REST_API_URL / KV_REST_API_TOKEN)' });
    }

    const id = (req.query?.id || req.query?.r || '').toString().trim();
    if (!id) return send(400, { error: 'Missing id' });

    const key = `ai-face:${id}`;
    const r = await fetch(`${KV_REST_API_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
    });

    const text = await r.text();
    if (!r.ok) {
      let err = text;
      try { err = JSON.parse(text)?.error || err; } catch {}
      return send(404, { error: `KV get failed: ${err}` });
    }

    // Upstash는 value를 그대로 문자열로 반환하는 경우가 많음
    let value = text;
    try {
      const parsed = JSON.parse(text);
      value = parsed?.result ?? parsed?.value ?? parsed ?? text;
    } catch {} // text 그대로 유지

    // 최종 데이터 오브젝트로 보정
    let data = value;
    if (typeof value === 'string') {
      try { data = JSON.parse(value); } catch { /* 그대로 둠 */ }
    }

    if (!data) return send(404, { error: 'Not found' });
    return send(200, { ok: true, data });
  } catch (e) {
    return send(500, { error: e?.message || 'Unexpected server error' });
  }
}