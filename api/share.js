// /api/share.js
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv(); // KV_URL / KV_REST_API_URL / KV_REST_API_TOKEN 사용

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { result, type = 'match' } = req.body || {};
    if (!result) return res.status(400).json({ error: 'No result data provided' });

    // 8자리 키
    const key = 's:' + Math.random().toString(36).slice(2, 10);
    // 결과 객체 전체를 그대로 저장 (7일 만료)
    await redis.set(key, { type, result }, { ex: 60 * 60 * 24 * 7 });

    // 현재 도메인 기준 공유 URL
    const origin = req.headers['x-forwarded-host']
      ? `https://${req.headers['x-forwarded-host']}`
      : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
    const url = `${origin}/?r=${encodeURIComponent(key)}`;

    return res.status(200).json({ ok: true, id: key, url });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Share error' });
  }
}
