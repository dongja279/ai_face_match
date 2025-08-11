// /api/match.js
// OpenAI 호출 + 응답 스키마 강제/보정 + 안정 파서

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { imgA, imgB } = await req.json?.() ?? req.body ?? {};
    if (!imgA || !imgB) {
      return res.status(400).json({ error: 'imgA, imgB are required' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is missing' });
    }

    // ————————— 프롬프트 (중복·빈칸 방지 강제) —————————
    const system = `
너는 세계 최고 수준의 한국 관상 전문가이자 성실한 데이터 라벨러다.
두 사람의 정면 얼굴 사진을 보고, 아래 스키마의 JSON만 반환한다(설명·여분 텍스트 금지).

규칙:
- 모든 "reason"에는 반드시 2~3개의 구체 관상 특징(예: "이마가 넓고 매끈함", "콧대가 곧고 코끝이 둥글다", "눈꼬리가 올라가 미소형", "입술이 도톰")을 포함.
- A와 B의 "reason" 문장은 서로 다르게 쓸 것(표현/근거 중복 최소화).
- "verdict"는 그 이유가 왜 해당 운(재물/연애/건강)으로 이어지는지 한 문장으로 요약.
- "tips"는 2개 한국어 짧은 조언 배열.
- "strengths"/"cautions"는 각각 2~3개 자연스러운 문장 배열.
- 점수는 0~100 정수.
- 한국어만 사용.
- 스키마 키를 추가/삭제 금지.

JSON 스키마:
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

    const user = {
      role: 'user',
      content: [
        { type: 'text', text: '아래 두 장의 얼굴 사진을 분석해 주세요. 위 JSON 스키마만 반환하세요.' },
        { type: 'image_url', image_url: { url: imgA } },
        { type: 'image_url', image_url: { url: imgB } },
      ],
    };

    const temperature = 0.15; // 일관성↑, 중복↓
    const model = 'gpt-4o-mini'; // 필요시 gpt-4o

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: 'system', content: system },
          user,
        ],
        response_format: { type: 'json_object' },
      }),
    });

    const json = await r.json();
    if (!r.ok) {
      console.error('OpenAI error:', json);
      return res.status(500).json({ error: json.error?.message || 'OpenAI request failed' });
    }

    // 안전 파싱
    let raw = json.choices?.[0]?.message?.content ?? '';
    raw = raw.replace(/^```json\s*|\s*```$/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error('JSON parse failed:', raw);
      return res.status(500).json({ error: 'LLM JSON parse failed' });
    }

    // ————— 스키마 보정(누락 방지) —————
    const blankBlock = () => ({ reason: '관상 특징 분석 보완 중', verdict: '추가 판단이 필요합니다.', tips: ['생활 균형을 유지하세요.', '충분한 휴식을 취하세요.'] });
    const fillPerson = (p) => ({
      wealth:  normBlock(p?.wealth)  ?? blankBlock(),
      love:    normBlock(p?.love)    ?? blankBlock(),
      health:  normBlock(p?.health)  ?? blankBlock(),
    });
    function normBlock(b) {
      if (!b) return null;
      const reason  = str(b.reason,  '관상 특징 분석 보완 중');
      const verdict = str(b.verdict, '추가 판단이 필요합니다.');
      const tips    = arr(b.tips,    ['생활 균형을 유지하세요.', '충분한 휴식을 취하세요.']);
      return { reason, verdict, tips };
    }
    function str(v, d) { return (typeof v === 'string' && v.trim()) ? v.trim() : d; }
    function arr(v, d) { return Array.isArray(v) && v.length ? v.slice(0,3).map(x=>String(x)) : d; }

    const out = {
      personA: fillPerson(parsed?.personA || {}),
      personB: fillPerson(parsed?.personB || {}),
      compatibility: {
        love_friendship: {
          score: num(parsed?.compatibility?.love_friendship?.score, 75),
          strengths: arr(parsed?.compatibility?.love_friendship?.strengths, ['서로의 감정을 잘 이해함', '긍정적 에너지 교류']),
          cautions:  arr(parsed?.compatibility?.love_friendship?.cautions,  ['의사소통 방식 차이 주의', '감정적 반응 과열 주의']),
        },
        business: {
          score: num(parsed?.compatibility?.business?.score, 70),
          strengths: arr(parsed?.compatibility?.business?.strengths, ['역할 분담이 잘 맞음', '책임감/성실함 상호 보완']),
          cautions:  arr(parsed?.compatibility?.business?.cautions,  ['의사결정 속도 차이', '리스크 선호 차이']),
        },
      },
    };
    function num(v, d) {
      const n = Number(v);
      return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : d;
    }

    return res.status(200).json(out);
  } catch (e) {
    console.error('handler error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
}