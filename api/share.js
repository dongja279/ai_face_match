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
    // 1) ENV 체크
    const { KV_REST_API_URL, KV_REST_API_TOKEN, VERCEL_URL } = process.env;
    if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
      return send(500, { error: 'Missing KV env vars (KV_REST_API_URL / KV_REST_API_TOKEN)' });
    }

    // 2) Body 수신 (Vercel 런타임 호환)
    let raw = '';
    await new Promise((resolve, reject) => {
      req.on('data', (c) => (raw += c));
      req.on('end', resolve);
      req.on('error', reject);
    });

    let payload;
    try { payload = JSON.parse(raw); }
    catch { return send(400, { error: 'Invalid JSON body' }); }

    if (!payload || typeof payload !== 'object') {
      return send(400, { error: 'Invalid payload' });
    }

    // 3) data 정규화 (문자열/객체 모두 허용)
    let data = payload.data;
    if (!data) return send(400, { error: 'No result data provided' });

    // 문자열이면 JSON 파싱 시도
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { /* 순수 텍스트면 그대로 둠 */ }
    }

    // 4) 대용량 필드 깊은 제거 (imgA/imgB가 어디에 있든)
    const prune = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(prune);
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        // 키 이름으로 판단
        if (k.toLowerCase() === 'imga' || k.toLowerCase() === 'imgb') continue;
        out[k] = prune(v);
      }
      return out;
    };
    if (typeof data === 'object') data = prune(data);

    // 5) 보관 값 직렬화 및 사이즈 검사 (~1MB 이하)
    const value = typeof data === 'string' ? data : JSON.stringify(data);
    const bytes = Buffer.byteLength(value, 'utf8');
    if (bytes > 950_000) {
      return send(413, { error: 'Payload too large for KV (≤ ~1MB)' });
    }

    // 6) 키 생성
    const id = Math.random().toString(36).slice(2, 10);
    const key = `ai-face:${id}`;

    // 7) Upstash REST: set (JSON body)
    const r = await fetch(`${KV_REST_API_URL}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value, ex: 60 * 60 * 24 * 7 }), // 7일 보관
    });

    const text = await r.text();
    if (!r.ok) {
      let err = text;
      try { err = JSON.parse(text)?.error || err; } catch {}
      return send(500, { error: `KV set failed: ${err}` });
    }

    // 8) 최종 공유 URL은 항상 share.html로
    const base = VERCEL_URL
      ? `https://${VERCEL_URL}`
      : `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const url = `${base}/share.html?r=${encodeURIComponent(id)}`;

    return send(200, { ok: true, id, url });
  } catch (e) {
    return send(500, { error: e?.message || 'Unexpected server error' });
  }
}
