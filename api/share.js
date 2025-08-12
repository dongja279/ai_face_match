// /api/share.js
export default async function handler(req, res) {
  const send = (code, obj) => {
    res.status(code)
      .setHeader('Content-Type', 'application/json')
      .setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(obj));
  };

  if (req.method !== 'POST') return send(405, { error: 'Method not allowed' });

  try {
    const { KV_REST_API_URL, KV_REST_API_TOKEN, VERCEL_URL } = process.env;
    if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
      return send(500, { error: 'Missing KV env vars (KV_REST_API_URL / KV_REST_API_TOKEN)' });
    }

    // raw body 수신
    let raw = '';
    await new Promise((resolve, reject) => {
      req.on('data', (c) => (raw += c));
      req.on('end', resolve);
      req.on('error', reject);
    });

    let payload;
    try { payload = JSON.parse(raw); }
    catch { return send(400, { error: 'Invalid JSON body' }); }
    if (!payload || typeof payload !== 'object') return send(400, { error: 'Invalid payload' });

    // data 정규화 (문자열/객체 허용)
    let data = payload.data;
    if (!data) return send(400, { error: 'No result data provided' });
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch {/*그냥 문자열이면 그대로 둠*/}
    }

    // 대용량 필드 깊은 제거
    const prune = (v) => {
      if (!v || typeof v !== 'object') return v;
      if (Array.isArray(v)) return v.map(prune);
      const o = {};
      for (const [k, val] of Object.entries(v)) {
        const key = k.toLowerCase();
        if (key === 'imga' || key === 'imgb') continue;
        o[k] = prune(val);
      }
      return o;
    };
    if (typeof data === 'object') data = prune(data);

    const value = typeof data === 'string' ? data : JSON.stringify(data);
    const bytes = Buffer.byteLength(value, 'utf8');
    if (bytes > 950_000) return send(413, { error: 'Payload too large for KV (≤ ~1MB)' });

    const id = Math.random().toString(36).slice(2, 10);
    const key = `ai-face:${id}`;

    const r = await fetch(`${KV_REST_API_URL}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value, ex: 60 * 60 * 24 * 7 }), // 7일
    });

    const text = await r.text();
    if (!r.ok) {
      let err = text;
      try { err = JSON.parse(text)?.error || err; } catch {}
      return send(500, { error: `KV set failed: ${err}` });
    }

    // 👉 현재 호스트 우선 사용(프리뷰/프로덕션 모두 OK)
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers.host || VERCEL_URL;
    const base  = `${proto}://${host}`;
    const url   = `${base}/share.html?r=${encodeURIComponent(id)}`;

    return send(200, { ok: true, id, url });
  } catch (e) {
    return send(500, { error: e?.message || 'Unexpected server error' });
  }
}
