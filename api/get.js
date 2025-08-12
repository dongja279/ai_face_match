// /api/get.js
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const raw = await kv.get(`share:${id}`);
    if (!raw) return res.status(404).json({ error: 'Not Found or expired' });

    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return res.status(200).json(data);
  } catch (e) {
    console.error('Get API Error:', e);
    return res.status(500).json({ error: 'Failed to fetch shared result' });
  }
}
