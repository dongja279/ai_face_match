import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'missing id' });
  const data = await kv.get(`face:${id}`);
  if (!data) return res.status(404).json({ error: 'not found' });
  return res.status(200).json(data);
}
