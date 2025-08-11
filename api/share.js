// /api/share.js
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { result } = req.body || {};
  if (!result) {
    return res.status(400).json({ error: 'missing result' });
  }

  // 8자리 짧은 ID
  const id = crypto.randomUUID().slice(0, 8);

  // 7일 동안 보관
  await kv.set(`face:${id}`, result, { ex: 60 * 60 * 24 * 7 });

  return res.status(200).json({ id });
