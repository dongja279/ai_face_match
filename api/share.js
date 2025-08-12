// /api/share.js
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { result, pics = {}, ttl = 60 * 60 * 24 * 7 } = await readJSON(req);
    if (!result) return res.status(400).json({ error: 'missing result' }); // ← 400 원인

    // Upstash KV (Environment Variables 필요)
    const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
    if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
      return res.status(500).json({ error: 'KV not configured' });
    }

    // 저장 payload
    const payload = {
      result,
      pics,
      createdAt: Date.now()
    };

    const id = crypto.randomUUID();
    const value = JSON.stringify(payload);

    // Upstash REST: set/{key}/{value}?EX=ttl
    const url = `${KV_REST_API_URL}/set/${id}/${encodeURIComponent(value)}?EX=${ttl}`;
    const up = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
    });
    const upJson = await up.json();
    if (!up.ok || upJson?.result !== 'OK') {
      return res.status(500).json({ error: 'kv set failed' });
    }

    // 공유 URL 반환 (예: https://도메인/?r=<id>)
    const base =
      (req.headers['x-forwarded-proto'] ? req.headers['x-forwarded-proto'] : 'https') +
      '://' + req.headers.host;
    const shareUrl = `${base}/?r=${id}`;
    res.status(200).json({ url: shareUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e?.message || 'server error' });
  }
}

async function readJSON(req) {
  const buf = await new Promise((resolve, reject) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => resolve(d));
    req.on('error', reject);
  });
  try { return JSON.parse(buf || '{}'); } catch { return {}; }
}
