// /api/kv-selftest.js
export default async function handler(req, res) {
  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    return res.status(500).json({ error: 'Missing KV env vars' });
  }

  try {
    const testKey = 'selftest:' + Date.now();
    const testValue = { hello: 'world', time: new Date().toISOString() };

    // 1) 저장
    const saveRes = await fetch(`${KV_REST_API_URL}/set/${encodeURIComponent(testKey)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value: JSON.stringify(testValue), ex: 60 }), // 60초 TTL
    });

    const saveText = await saveRes.text();
    if (!saveRes.ok) {
      return res.status(500).json({ step: 'save', error: saveText });
    }

    // 2) 읽기
    const getRes = await fetch(`${KV_REST_API_URL}/get/${encodeURIComponent(testKey)}`, {
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
      },
    });
    const getText = await getRes.text();

    let getValue;
    try {
      getValue = JSON.parse(getText);
    } catch {
      getValue = getText;
    }

    return res.status(200).json({
      ok: true,
      key: testKey,
      saved: testValue,
      loaded: getValue,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
