// /api/load.js
export default async function handler(req, res) {
  const send = (code, obj) => {
    res.status(code).setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };

  if (req.method !== 'GET') return send(405, { error: 'Method not allowed' });

  try {
    const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
    if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
      return send(500, { error: 'Missing KV env vars (KV_REST_API_URL / KV_REST_API_TOKEN)' });
    }

    const id = (req.query.id || '').toString().trim();
    if (!id) return send(400, { error: 'Missing id' });

    const key = `ai-face:${id}`;

    // Upstash GET
    const r = await fetch(`${KV_REST_API_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
    });
    const text = await r.text();
    if (!r.ok) {
      let err = text;
      try { err = JSON.parse(text)?.error || err; } catch {}
      return send(500, { error: `KV get failed: ${err}` });
    }

    // Upstash는 { result: "...(stringified)..." } 식으로 줄 수 있음
    let result = null;
    try {
      const obj = JSON.parse(text);
      result = obj?.result ?? null;
    } catch {
      // 방어
      result = null;
    }
    if (result == null) return send(404, { error: 'Not found' });

    // 1) result 가 문자열이라면 파싱 시도
    if (typeof result === 'string') {
      try { result = JSON.parse(result); } catch {}
    }
    // 2) { value: "..." } 형태면 안쪽 value를 다시 파싱
    if (result && typeof result === 'object' && 'value' in result) {
      let v = result.value;
      if (typeof v === 'string') {
        try { v = JSON.parse(v); } catch {}
      }
      result = v;
    }

    // 이제 result 는 우리가 저장한 최종 JSON
    if (!result || typeof result !== 'object') {
      return send(500, { error: 'Malformed data in KV' });
    }

    return send(200, { ok: true, data: result });
  } catch (e) {
    return send(500, { error: e?.message || 'Unexpected server error' });
  }
}
