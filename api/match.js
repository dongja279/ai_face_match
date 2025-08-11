// /api/match.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imgA, imgB } = req.body || {};
    if (!imgA || !imgB) return res.status(400).json({ error: 'imgA and imgB are required' });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY is missing' });

    // 전문가 컨설팅 톤 + 디테일 + 강점/주의/팁 + 점수 근거
    const system = [
      '당신은 세계 최고 수준의 관상학자이자 얼굴 분석 컨설턴트다.',
      '이 서비스는 오락/참고용이며, 모든 해석은 존중의 언어로 제시한다. 차별적/단정적 표현은 금지.',
      '사진에서 관찰 가능한 요소(얼굴형, 이마, 눈썹, 눈, 코, 입/입술, 귀, 턱/턱선, 피부/표정)를 근거로 디테일을 우선 설명한다.',
      '각 개인은 요약 → 부위별 특징 → 관상 풀이 순으로 작성한다.',
      '두 사람의 궁합은 강점/주의/실천 팁을 구체적으로 제시하며, 점수(0~100)와 간단한 근거를 포함한다.',
      '항상 JSON 객체로만 응답한다. 한글 사용.'
    ].join('\n');

    const schemaText = `
아래 스키마의 JSON만 반환하세요. 키 이름을 반드시 지키세요.

{
  "score": number,                 // 0~100
  "score_reason": string,          // 점수 산출 근거(핵심)
  "person1": {
    "overall": string,
    "face_shape": string, "forehead": string, "eyebrows": string, "eyes": string,
    "nose": string, "mouth": string, "ears": string, "jaw_chin": string, "skin_expression": string,
    "analysis": string
  },
  "person2": {
    "overall": string,
    "face_shape": string, "forehead": string, "eyebrows": string, "eyes": string,
    "nose": string, "mouth": string, "ears": string, "jaw_chin": string, "skin_expression": string,
    "analysis": string
  },
  "compatibility": {
    "summary": string,
    "strengths": string[],
    "cautions": string[],
    "tips": string[]
  }
}`;

    const payload = {
      model: 'gpt-4o-mini',
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'text', text: schemaText },
            { type: 'text', text: '다음 두 정면 얼굴 사진을 분석하세요. JSON만 반환합니다.' },
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
    try { json = JSON.parse(data?.choices?.[0]?.message?.content || '{}'); }
    catch { json = { error: 'Invalid JSON from model' }; }
    return res.status(200).json(json);

  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Unknown error' });
  }
}
