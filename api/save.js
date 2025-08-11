import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data } = req.body || {};
    if (!data) {
      return res.status(400).json({ error: 'No data provided' });
    }

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await kv.set(id, JSON.stringify(data), { ex: 60 * 60 * 24 * 7 }); // 7일 저장

    res.status(200).json({ id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}