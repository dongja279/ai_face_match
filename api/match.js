// /api/match.js  — Vercel Serverless Function (Node/Edge 모두 OK)

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { imgA, imgB } = req.body || {};
    if (!imgA || !imgB) {
      return res.status(400).json({ error: 'imgA, imgB 둘 다 필요합니다.' });
    }

    // === System Prompt: 점수 스케일 고정 + 관상 근거 디테일 ===
    const system = `
너는 세계 최고 수준의 한국 관상 전문가이자 성실한 데이터 라벨러다.
두 사람의 정면 얼굴 사진을 보고 아래 JSON 스키마로만 100% 출력한다. 불필요한 텍스트 금지.

규칙:
- 모든 "score"는 **정수형 0~100**으로만 출력하라. 0~10, 0~1, "75/100" 같은 형식 금지.
- A와 B의 "근거"에는 구체 관상 특징을 최소 2~3개 적는다.
  예) "이마가 넓고 매끈함", "콧대가 곧고 코끝이 둥글다",
      "눈꼬리가 살짝 올라가 밝은 인상", "입꼬리가 올라간 미소형", "귀가 도톰"
- 각 운(재물/연애/건강)은 '근거(관상 특징)' → '결론' → '실천 팁 2개' 순으로 쓴다.
- 설명은 한국어.

출력 JSON:
{
  "personA": {
    "wealth":  { "reason": "", "verdict": "", "tips": ["",""] },
    "love":    { "reason": "", "verdict": "", "tips": ["",""] },
    "health":  { "reason": "", "verdict": "", "tips": ["",""] }
  },
  "personB": {
    "wealth":  { "reason": "", "verdict": "", "tips": ["",""] },
    "love":    { "reason": "", "verdict": "", "tips": ["",""] },
    "health":  { "reason": "", "verdict": "", "tips": ["",""] }
  },
  "compatibility": {
    "love_friendship": {
      "score": 0,
      "strengths": ["",""],
      "cautions": ["",""]
    },
    "business": {
      "score": 0,
      "strengths": ["",""],
      "cautions": ["",""]
    }
  }
}
`.trim();

    // 유저 메시지(이미지 2장)
    const user = {
      role: 'user',
      content: [
        { type: 'text', text: '아래 두 장의 얼굴 사진을 분석하세요.' },
        { type: 'image_url', image_url: { url: imgA } },
        { type: 'image_url', image_url: { url: imgB } },
      ],
    };

    // OpenAI 호출
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY 누락' });

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2, // 일관성↑
        messages: [
          { role: 'system', content: system },
          user,
        ],
        response_format: { type: 'json_object' }, // JSON 강제
      }),
    });

    if (!resp.ok) {
      const t = await resp.text().catch(()=> '');
      return res.status(resp.status).json({ error: 'OpenAI 오류', detail: t });
    }

    const data = await resp.json();
    let out;
    try {
      out = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    } catch {
      out = {};
    }

    // ---- 안전 장치: 점수 정규화 0~100 정수 ----
    const norm = (n) => {
      if (typeof n === 'string') {
        const m = n.match(/\d{1,3}/g);
        if (m) n = parseInt(m[0], 10);
      }
      n = Number(n);
      if (!isFinite(n)) n = 0;
      if (n <= 1) n = n * 100;
      else if (n <= 10) n = n * 10;
      n = Math.round(n);
      return Math.max(0, Math.min(100, n));
    };

    if (out?.compatibility?.love_friendship) {
      out.compatibility.love_friendship.score = norm(out.compatibility.love_friendship.score);
    }
    if (out?.compatibility?.business) {
      out.compatibility.business.score = norm(out.compatibility.business.score);
    }

    return res.status(200).json(out);

  } catch (e) {
    return res.status(500).json({ error: 'server_error', detail: String(e?.message || e) });
  }
}