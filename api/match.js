// /api/match.js
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { imgA, imgB } = req.body || {};
    if (!imgA || !imgB) {
      return res.status(400).json({ error: 'imgA, imgB are required (data URL or URL)' });
    }

    const systemPrompt = `
너는 세계 최고의 한국인 관상학자다. 두 장의 얼굴 사진(A,B)을 바탕으로
과학적 태도와 관상 전통의 해석을 균형 있게 적용한다.
절대 점집식 과장 표현이나 단정적 운명론은 피하고, 근거를 짧게 제시한다.
한국어로만 답하고, 아래 JSON 스키마 **그대로** 출력한다. 텍스트나 설명을 JSON 바깥에 쓰지 마라.

반드시 이 JSON 스키마로:
{
  "personA": {
    "summary": "A 인상 한줄요약",
    "features": {
      "face_shape": "", "forehead": "", "eyebrows": "", "eyes": "",
      "nose": "", "mouth_lips": "", "ears": "", "jaw_chin": "", "skin_expression": ""
    },
    "analysis": "A 해석 2~3문장",
    "fortune": {
      "wealth": { "summary": "재물운 요약 1~2문장", "tips": ["짧은 조언 1", "짧은 조언 2"] },
      "love":   { "summary": "연애운 요약 1~2문장", "tips": ["짧은 조언 1", "짧은 조언 2"] },
      "health": { "summary": "건강운 요약 1~2문장", "tips": ["짧은 조언 1", "짧은 조언 2"] }
    }
  },
  "personB": { ... personA와 동일 구조 ... },
  "compatibility": {
    "romance_friendship": {
      "score": 0-100,
      "summary": "연애/우정 전반 요약 1문장(선택)",
      "strengths": ["강점 1", "강점 2"],
      "cautions":  ["주의점 1", "주의점 2"]
    },
    "business": {
      "score": 0-100,
      "summary": "비즈니스 전반 요약 1문장(선택)",
      "strengths": ["강점 1", "강점 2"],
      "cautions":  ["주의점 1", "주의점 2"]
    }
  }
}

가이드:
- 각 특징은 사진 기준 외형 관찰로 서술(얼굴형/눈/코 등) + 너무 단정적 성격/운명 단언 금지.
- 운세 섹션(재물/연애/건강)은 "사진에서 보이는 특징과 전통 관상 해석이 연결되는 정도"로만 간단히.
- 점수는 5 단위 정도의 현실적인 정수.
- 전체 길이는 간결하게, 실용 조언(tips)은 짧고 행동지향.
`;

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: "아래 두 장의 얼굴 사진을 분석해 위 JSON 스키마로만 출력하세요." },
          { type: "image_url", image_url: { url: imgA } },
          { type: "image_url", image_url: { url: imgB } }
        ]
      }
    ];

    // OpenAI API 호출
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.4,
        response_format: { type: "json_object" }
      })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return res.status(resp.status).json({ error: txt });
    }

    const data = await resp.json();
    let payload = {};
    try {
      payload = JSON.parse(data.choices?.[0]?.message?.content || "{}");
    } catch (e) {
      return res.status(500).json({ error: "Invalid JSON from model" });
    }

    return res.status(200).json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
