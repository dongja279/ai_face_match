// /api/share.js
import { kv } from '@vercel/kv';
import { nanoid } from 'nanoid';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { result, type = 'match' } = req.body || {};
    if (!result) return res.status(400).json({ error: 'No result data provided' });

    // 10글자 ID 생성
    const id = nanoid(10);

    // 24시간 만료 저장
    await kv.set(`share:${id}`, JSON.stringify({ type, result }), { ex: 60 * 60 * 24 });

    // 배포 도메인 자동 감지 (ENV가 있으면 우선)
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ||
      `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const url = `${base}/share/${id}`;

    return res.status(200).json({ url, id });
  } catch (e) {
    console.error('Share API Error:', e);
    return res.status(500).json({ error: 'Failed to create share link' });
  }
}
