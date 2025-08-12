// /api/share.js
export default async function handler(req, res) {
  const send = (code, obj) => {
    res.status(code).setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };

  if (req.method !== 'POST') return send(405, { error: 'Method not allowed' });

  try {
    const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
    if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
      return send(500, { error: 'Missing KV env vars (KV_REST_API_URL / KV_REST_API_TOKEN)' });
    }

    // body 파싱
    let bodyStr = '';
    await new Promise((resolve, reject) => {
      req.on('data', (c) => (bodyStr += c));
      req.on('end', resolve);
      req.on('error', reject);
    });

    let payload;
    try { payload = JSON.parse(bodyStr); }
    catch { return send(400, { error: 'Invalid JSON body' }); }

    const data = payload?.data;
    if (!data) return send(400, { error: 'No result data provided' });

    // 이미지 같은 큰 필드는 저장 제외
    delete data.imgA;
    delete data.imgB;

    const value = JSON.stringify(data);
    const bytes = Buffer.byteLength(value, 'utf8');
    if (bytes > 900_000) return send(413, { error: 'Payload too large for KV (limit ~1MB)' });

    // key 생성
    const id = Math.random().toString(36).slice(2, 10);
    const key = `ai-face:${id}`;

    // Upstash KV 저장
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

    // ✅ 공유 URL은 항상 현재 호스트(프로덕션 도메인)로 생성
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const base  = `${proto}://${host}`;
    // 필요 시 환경변수로 고정하고 싶다면:
    // const base = process.env.PUBLIC_BASE_URL || `${proto}://${host}`;

    const url = `${base}/share.html?r=${encodeURIComponent(id)}`;
    return send(200, { ok: true, id, url });
  } catch (e) {
    return send(500, { error: e?.message || 'Unexpected server error' });
  }
}