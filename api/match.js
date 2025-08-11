// /api/match.js
import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imgA, imgB } = req.body;
  if (!imgA || !imgB) {
    return res.status(400).json({ error: "두 장의 이미지 데이터가 필요합니다." });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const prompt = `
당신은 세계 최고의 관상학자입니다.
다음 두 사람의 얼굴 이미지를 보고 매우 상세한 관상 궁합 분석을 해주세요.
결과는 JSON 형식으로만 출력합니다. 아래 형식과 키 이름을 반드시 지켜주세요.

{
  "score": (0~100 사이 정수),
  "score_reason": "점수의 근거 설명",
  "person1": {
    "overall": "총평",
    "face_shape": "얼굴형",
    "forehead": "이마 특징",
    "eyebrows": "눈썹 특징",
    "eyes": "눈 특징",
    "nose": "코 특징",
    "mouth": "입/입술 특징",
    "ears": "귀 특징",
    "jaw_chin": "턱/턱선 특징",
    "skin_expression": "피부/표정 특징",
    "analysis": "관상 풀이"
  },
  "person2": {
    "overall": "총평",
    "face_shape": "얼굴형",
    "forehead": "이마 특징",
    "eyebrows": "눈썹 특징",
    "eyes": "눈 특징",
    "nose": "코 특징",
    "mouth": "입/입술 특징",
    "ears": "귀 특징",
    "jaw_chin": "턱/턱선 특징",
    "skin_expression": "피부/표정 특징",
    "analysis": "관상 풀이"
  },
  "compatibility": {
    "summary": "궁합 해석 요약",
    "strengths": ["서로 잘 맞는 점 1", "서로 잘 맞는 점 2", "서로 잘 맞는 점 3"],
    "cautions": ["조심해야 할 점 1", "조심해야 할 점 2"],
    "tips": ["좋은 관계 유지를 위한 팁 1", "좋은 관계 유지를 위한 팁 2"]
  }
}

사진은 다음과 같습니다.
A 사진: ${imgA}
B 사진: ${imgB}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "당신은 세계 최고의 관상학자입니다. 반드시 JSON만 반환하세요." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    });

    // 응답 텍스트를 JSON으로 파싱
    let parsed;
    try {
      parsed = JSON.parse(completion.choices[0].message.content);
    } catch (err) {
      return res.status(500).json({ error: "AI 응답 파싱 실패", raw: completion.choices[0].message.content });
    }

    res.status(200).json(parsed);

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "서버 에러 발생" });
  }
}
