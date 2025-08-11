import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'No id provided' });
    }

    const raw = await kv.get(id);
    if (!raw) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.status(200).json(JSON.parse(raw));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}