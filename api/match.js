// /api/match.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imgA, imgB } = req.body || {};
    if (!imgA || !imgB) return res.status(400).json({ error: 'imgA and imgB are required' });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY is missing' });

    // ✅ 세계 최고 관상학자 톤 + 안전/윤리 고지 + 세부 부위 분석 + 궁합 강점/주의/팁
    const system = [
      '당신은 세계 최고 수준의 관상학자이자 얼굴 분석 전문가다.',
      '다만 관상 해석은 어디까지나 오락/참고용이며, 사람에 대한 차별적/단정적 서술을 피하고 존중하는 어휘를 사용한다.',
      '두 사람의 정면 얼굴 사진을 바탕으로 각 개인의 관상 특징과 풀이를 상세히 기술하고, 두 사람의 궁합을 점수(0~100)와 함께 설명한다.',
      '반드시 아래 JSON 스키마를 충실히 채운다. 한글로 답하되, 간결하지만 전문적인 톤을 유지한다.',
      '가능하면 사진에서 관찰 가능한 근거(눈 크기·쌍커풀·코 산·입꼬리·귀 윤곽·턱선 등)를 근거로 든다.',
      '점수는 0~100 사이 정수로 제시하고, 점수 산출 근거를 짧게 요약한다.'
    ].join('\n');

    // 응답 형식(객체 강제)
    const payload = {
      model: 'gpt-4o-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'text', text:
`아래 두 얼굴 이미지를 바탕으로 JSON만 반환해.
스키마:
{
  "score": number,                 // 0~100
  "score_reason": string,          // 점수 근거
  "personA": {
    "summary": string,             // 인상 요약
    "features": {
      "face_shape": string,        // 얼굴형
      "forehead": string,          // 이마
      "eyebrows": string,          // 눈썹
      "eyes": string,              // 눈
      "nose": string,              // 코
      "mouth_lips": string,        // 입/입술
      "ears": string,              // 귀
      "jaw_chin": string,          // 턱/턱선
      "skin_expression": string    // 피부/표정 인상
    },
    "analysis": string             // 관상학적 풀이
  },
  "personB": { ... personA와 동일 구조 ... },
  "compatibility": {
    "strengths": string[],         // 서로 잘 맞는 점
    "cautions": string[],          // 조심해야 할 점
    "summary": string,             // 종합 해석
    "tips": string[]               // 실천 팁
  }
}`
            },
            { type: 'image_url', image_url: { url: imgA } },
            { type: 'image_url', image_url: { url: imgB } }
          ]
        }
      ]
    };

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(500).json({ error: 'OpenAI error', detail: t });
    }

    const data = await r.json();
    let json = {};
    try {
      json = JSON.parse(data?.choices?.[0]?.message?.content || '{}');
    } catch {
      json = { error: 'Invalid JSON from model' };
    }
    return res.status(200).json(json);
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Unknown error' });
  }
}
