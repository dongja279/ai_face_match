// api/match.js
// 관상궁합 서버 함수 — OpenAI 멀티모달 호출 + 안정적 JSON 파싱/검증

export default async function handler(req, res) {
  try {
    // 1) 메서드 가드
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 2) 입력 파라미터 체크
    const { imgA, imgB } = req.body || {};
    if (!imgA || !imgB) {
      return res.status(400).json({ error: '이미지 A/B가 필요합니다.' });
    }
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY 미설정' });
    }

    // 3) 프롬프트(중복 근거 방지 + JSON-only 강제)
    const system = `
너는 세계 최고 수준의 한국 관상 전문가이자 성실한 데이터 라벨러다.
두 사람 얼굴 사진을 보고 아래 JSON 스키마로만 답한다.

규칙:
- 각 운세의 "reason"(근거)은 반드시 2~3개의 구체적 관상 특징을 적는다.
  예) "이마가 넓고 매끈함", "콧대가 곧고 콧끝이 둥글다", "눈꼬리가 살짝 올라 밝은 인상", "입꼬리가 올라 미소형", "귀볼이 두툼함", "턱선이 부드럽다/각지다".
- "verdict"(결론)은 그 특징이 왜 해당 운(재물/연애/건강)으로 이어지는지 1~2문장으로 요약한다.
- A와 B의 reason 문장은 동일 금지(단어/표현 중복 최소화).
- 설명은 한국어.
- JSON 외의 어떤 텍스트도 출력하지 말 것. 코드블록(\`\`\`)도 금지.
- 아래 스키마의 키를 추가/삭제하지 말 것. 값만 채운다.

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

    // 4) OpenAI 호출 (멀티모달)
    const model = 'gpt-4o-mini'; // 필요시 'gpt-4o'로 변경 가능
    const temperature = 0.8; // 다양성↑, 중복 표현 감소

    const payload = {
      model,
      temperature,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'text', text: '두 사람의 얼굴 정면 사진입니다. 위 규칙을 지켜 JSON만 반환하세요.' },
            { type: 'image_url', image_url: { url: imgA } },
            { type: 'image_url', image_url: { url: imgB } }
          ]
        }
      ]
    };

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      console.error('OpenAI error:', r.status, errText);
      return res.status(500).json({ error: 'AI 요청 실패', detail: errText?.slice?.(0, 400) });
    }

    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content || '';
    if (!content) {
      return res.status(500).json({ error: 'AI 응답 비어있음' });
    }

    // 5) JSON만 안전 파싱 (앞뒤 잡소리 제거용)
    const parsed = safeJsonParse(content);
    if (!parsed) {
      console.error('RAW content for debugging:\n', content);
      return res.status(500).json({ error: 'JSON 파싱 실패' });
    }

    // 6) 스키마 보정(누락 필드 기본값 채우기)
    const result = normalizeSchema(parsed);

    // 7) 응답
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(result);
  } catch (e) {
    console.error('match.js fatal:', e);
    return res.status(500).json({ error: '서버 오류', detail: String(e?.message || e) });
  }
}

/* ---------- 유틸: 안전 파싱 ---------- */
function safeJsonParse(text) {
  // 1차 시도: 바로 파싱
  try { return JSON.parse(text); } catch (_) {}

  // 2차 시도: 본문에서 JSON 블록만 추출
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    const slice = text.slice(first, last + 1);
    try { return JSON.parse(slice); } catch (_) {}
  }
  return null;
}

/* ---------- 유틸: 스키마 보정 ---------- */
function normalizeSchema(obj) {
  const blankSection = () => ({ reason: '', verdict: '', tips: ['', ''] });
  const person = (p = {}) => ({
    wealth:  fill(p.wealth,  blankSection()),
    love:    fill(p.love,    blankSection()),
    health:  fill(p.health,  blankSection())
  });
  const compBlock = (c = {}) => ({
    score: clampInt(c.score, 0, 100, 0),
    strengths: Array.isArray(c.strengths) ? c.strengths : [],
    cautions:  Array.isArray(c.cautions)  ? c.cautions  : []
  });

  return {
    personA: person(obj.personA),
    personB: person(obj.personB),
    compatibility: {
      love_friendship: compBlock(obj?.compatibility?.love_friendship),
      business:       compBlock(obj?.compatibility?.business)
    }
  };
}

function fill(src, tmpl) {
  const out = { ...tmpl, ...(src || {}) };
  if (!Array.isArray(out.tips)) out.tips = ['', ''];
  if (out.tips.length < 2) out.tips = [...out.tips, ''].slice(0, 2);
  out.reason  = toStr(out.reason);
  out.verdict = toStr(out.verdict);
  return out;
}

function toStr(v) {
  return (v === null || v === undefined) ? '' : String(v);
}

function clampInt(v, min, max, dflt) {
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) return dflt;
  return Math.max(min, Math.min(max, n));
}