// /api/share.js
export default async function handler(req, res) {
  const send = (code, obj) => {
    res
      .status(code)
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

    // raw body 읽기 (Vercel 호환)
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

    // 이미지 제거(있으면 용량 초과 방지)
    delete data.imgA;
    delete data.imgB;

    const value = JSON.stringify(data);
    const bytes = Buffer.byteLength(value, 'utf8');
    if (bytes > 900_000) return send(413, { error: 'Payload too large for KV (≈1MB limit)' });

    // key 생성
    const id = Math.random().toString(36).slice(2, 10);
    const key = `ai-face:${id}`;

    // 저장 (JSON body 방식)
    const setRes = await fetch(`${KV_REST_API_URL}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value, ex: 60 * 60 * 24 * 7 }), // 7일
    });
    const setText = await setRes.text();
    if (!setRes.ok) {
      let err = setText;
      try { err = JSON.parse(setText)?.error || err; } catch {}
      return send(500, { error: `KV set failed: ${err}` });
    }

    // 저장 검증: 즉시 GET
    const getRes = await fetch(`${KV_REST_API_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
    });
    const getText = await getRes.text();
    if (!getRes.ok) {
      let err = getText;
      try { err = JSON.parse(getText)?.error || err; } catch {}
      return send(500, { error: `KV verify failed: ${err}` });
    }

    // 최종 공유 URL은 반드시 share.html 사용
    const base = VERCEL_URL
      ? `https://${VERCEL_URL}`
      : `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const url = `${base}/share.html?r=${encodeURIComponent(id)}`;

    return send(200, { ok: true, id, url });
  } catch (e) {
    return send(500, { error: e?.message || 'Unexpected server error' });
  }
}