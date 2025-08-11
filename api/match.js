// /api/match.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imgA, imgB } = req.body || {};
    if (!imgA || !imgB) {
      return res.status(400).json({ error: '이미지 누락' });
    }

    const system = `
너는 세계 최고 수준의 한국 관상 전문가이자 성실한 데이터 라벨러다.
두 사람 얼굴 사진을 보고 아래 스키마의 JSON으로만 답한다.

규칙:
- "근거"에는 반드시 2~3개의 구체 관상 특징을 쓴다. (이마/눈/코/입/귀/턱선 등에서 발췌)
  예) "이마가 넓고 매끈함", "콧대가 곧고 코끝이 둥글다", "눈꼬리가 살짝 올라가 밝은 인상", "입꼬리가 올라가 미소형", "귀불이 두툼", "턱선이 부드럽다/각지다".
- "결론"은 그 특징이 왜 해당 운(재물/연애/건강)에 연결되는지 한두 문장으로 요약.
- A와 B의 "근거" 문장은 동일 금지(중복 최소화, 같은 포인트라도 표현을 다르게).
- 설명은 한국어.
- 아래 스키마를 100% 지키고 키를 추가/삭제하지 말 것.

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
      "cautions":  ["",""]
    },
    "business": {
      "score": 0,
      "strengths": ["",""],
      "cautions":  ["",""]
    }
  }
}
`.trim();

    // OpenAI 호출
    const temperature = 0.2; // 일관성↑
    const openaiKey = process.env.OPENAI_API_KEY;
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: "다음 두 장의 정면 얼굴 사진을 분석해 위 스키마로만 응답하세요." },
              { type: "image_url", image_url: { url: imgA } },
              { type: "image_url", image_url: { url: imgB } }
            ]
          }
        ]
      })
    });

    if (!resp.ok) {
      const t = await resp.text().catch(()=> '');
      return res.status(500).json({ error: t || 'openai error' });
    }

    const data = await resp.json();
    // 모델 답변 파싱
    let content = data?.choices?.[0]?.message?.content || "{}";
    // 코드 블록에 감싸오는 경우 제거
    content = content.trim().replace(/^```json\s*/i,'').replace(/```$/,'');
    let parsed;
    try { parsed = JSON.parse(content); }
    catch { return res.status(502).json({ error: "JSON 파싱 실패", raw: content }); }

    return res.status(200).json(parsed);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
}