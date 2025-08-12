// /api/get.js
import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

export default async function handler(req, res) {
  try {
    const id = (req.query.id || req.query.key || '').toString();
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const data = await redis.get(id);
    if (!data) return res.status(404).json({ error: 'Not found' });

    // data = { type, result }
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Get error' });
  }
}
