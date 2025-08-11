// /api/match.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imgA, imgB } = req.body || {};
    if (!imgA || !imgB) return res.status(400).json({ error: 'imgA and imgB are required' });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY is missing' });

    // 유료 컨설팅급 톤 + 근거 기반 + 세부 부위 + 강점/주의/팁 + 점수 근거
    const system = [
      '당신은 세계 최고 수준의 관상학자이자 얼굴 분석 컨설턴트다.',
      '이 서비스는 오락/참고용이며, 모든 해석은 존중의 언어로 제시한다. 차별적/단정적 표현은 금지.',
      '사진에서 관찰 가능한 요소(얼굴형, 이마, 눈썹, 눈, 코, 입/입술, 귀, 턱/턱선, 피부/표정)를 근거로 객관적인 디테일을 우선 제시한다.',
      '각 개인에 대해 요약 → 부위별 특징 → 관상학적 풀이 순으로 작성한다.',
      '두 사람의 궁합은 장점(강점), 주의점(조심할 점), 실천 팁을 구체적으로 제시한다.',
      '궁합 점수(0~100)는 과신을 피하고, 간단한 산출 근거를 함께 제공한다.',
      '항상 JSON 객체로만 응답한다. 한글 사용.'
    ].join('\n');

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
`아래 두 정면 얼굴 사진을 분석해 다음 스키마의 JSON만 반환하세요.

{
  "score": number,                 // 0~100
  "score_reason": string,          // 점수 산출 근거(핵심 요약)
  "personA": {
    "summary": string,
    "features": {
      "face_shape": string, "forehead": string, "eyebrows": string, "eyes": string,
      "nose": string, "mouth_lips": string, "ears": string, "jaw_chin": string, "skin_expression": string
    },
    "analysis": string
  },
  "personB": { ... personA와 동일 구조 ... },
  "compatibility": {
    "strengths": string[],         // 잘 맞는 점(구체)
    "cautions": string[],          // 조심해야 할 점(구체)
    "summary": string,             // 종합 해석
    "tips": string[]               // 관계에 도움이 되는 실천 팁
  }
}` },
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
