// /api/match.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imgA, imgB, model = 'gpt-4o-mini' } = req.body || {};
    if (!imgA || !imgB) return res.status(400).json({ error: 'missing images' });

    const sys = `
너는 세계 최고 수준의 한국 관상학 전문가이자 심층 분석가다.
두 사람의 "정면 얼굴" 이미지를 바탕으로 관상적 특징을 읽고, 
각 운세(재물/연애/건강)에 대해 '관상 특징 근거 → 결론 → 팁' 흐름으로 간결하게 정리한다.
또한 두 사람의 "연애/우정"과 "비즈니스" 궁합을 각각 0~100점으로 채점하고
'잘 맞는 점'과 '조심해야 할 점'을 각 2~4개씩 제시한다.

반드시 아래 JSON 스키마로만 출력하라. 한국어로 작성.
숫자/문장 외 불필요한 설명, 코드블록, 마크다운 금지.

{
  "personA": {
    "features": {
      "face_shape": "얼굴형",
      "forehead": "이마",
      "eyebrows": "눈썹",
      "eyes": "눈",
      "nose": "코",
      "mouth_lips": "입/입술",
      "ears": "귀",
      "jaw_chin": "턱/턱선",
      "skin_expression": "피부/표정"
    },
    "fortune": {
      "wealth":  { "reason": "관상 근거 1~2문장", "verdict": "결론 1~2문장", "tips": ["조언1","조언2"] },
      "love":    { "reason": "관상 근거 1~2문장", "verdict": "결론 1~2문장", "tips": ["조언1","조언2"] },
      "health":  { "reason": "관상 근거 1~2문장", "verdict": "결론 1~2문장", "tips": ["조언1","조언2"] }
    }
  },
  "personB": { 동일 구조 },
  "compatibility": {
    "love_friendship": {
      "score": 0,
      "strengths": ["잘 맞는 점 1","잘 맞는 점 2"],
      "cautions":  ["조심해야 할 점 1","조심해야 할 점 2"]
    },
    "business": {
      "score": 0,
      "strengths": ["잘 맞는 점 1","잘 맞는 점 2"],
      "cautions":  ["조심해야 할 점 1","조심해야 할 점 2"]
    }
  }
}
    `.trim();

    const messages = [
      { role: 'system', content: sys },
      {
        role: 'user',
        content: [
          { type: 'text', text: '다음 두 얼굴 사진을 분석하여 위 스키마 그대로 JSON만 반환하세요.' },
          { type: 'image_url', image_url: { url: imgA } },
          { type: 'image_url', image_url: { url: imgB } }
        ]
      }
    ];

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages
      })
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(500).json({ error: 'openai_error', detail: err });
    }

    const data = await r.json();
    let out;
    try {
      out = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    } catch {
      out = {};
    }
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: 'server_error', detail: String(e?.message || e) });
  }
}
