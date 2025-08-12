// /api/share.js
export default async function handler(req, res) {
  // 항상 JSON으로만 응답
  const send = (code, obj) => {
    res.status(code).setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };

  if (req.method !== 'POST') return send(405, { error: 'Method not allowed' });

  try {
    // --- 환경변수 체크
    const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
    if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
      return send(500, { error: 'Missing KV env vars (KV_REST_API_URL / KV_REST_API_TOKEN)' });
    }

    // --- body 파싱 (Vercel 환경 호환)
    let bodyStr = '';
    await new Promise((resolve, reject) => {
      req.on('data', (c) => (bodyStr += c));
      req.on('end', resolve);
      req.on('error', reject);
    });

    let payload;
    try {
      payload = JSON.parse(bodyStr);
    } catch {
      return send(400, { error: 'Invalid JSON body' });
    }

    const data = payload?.data;
    if (!data) return send(400, { error: 'No result data provided' });

    // 이미지/불필요 대형 필드 방어(혹시 들어왔다면 제거)
    delete data.imgA;
    delete data.imgB;

    const value = JSON.stringify(data);
    const bytes = Buffer.byteLength(value, 'utf8');
    if (bytes > 900_000) {
      return send(413, { error: 'Payload too large for KV (limit ~1MB)' });
    }

    // key 생성 (8~12자 랜덤)
    const id = Math.random().toString(36).slice(2, 10);
    const key = `ai-face:${id}`;

    // Upstash REST (POST JSON 방식)
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

    // 최종 공유 URL
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const url = `${base}/?r=${encodeURIComponent(id)}`;

    return send(200, { ok: true, id, url });
  } catch (e) {
    return send(500, { error: e?.message || 'Unexpected server error' });
  }
}
