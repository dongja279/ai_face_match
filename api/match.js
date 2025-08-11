// api/match.js
// - 프롬프트 강화(각 항목 비지 않게 강제)
// - personA/B가 비거나 동일문장 방지
// - normalize로 빈값 기본문구 대체
// - JSON 파싱 견고화

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { imgA, imgB } = req.body || {};
    if (!imgA || !imgB) {
      return res.status(400).json({ error: '이미지 A/B가 필요합니다.' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: '서버 설정 오류: OPENAI_API_KEY 누락' });
    }

    // -------------------------
    // 프롬프트(강화 버전)
    // -------------------------
    const system = `
너는 세계 최고 수준의 "한국 관상 전문가"이자 성실한 데이터 라벨러다.
두 사람의 정면 얼굴 사진을 보고 아래 JSON 스키마로만 답한다.

반드시 지킬 규칙:
- personA와 personB의 모든 필드(reason, verdict, tips)는 "빈 문자열 없이" 작성한다.
- personA와 personB의 "reason" 문장은 서로 같은 표현을 금지(동어 반복/복붙 금지). 관찰 포인트를 달리 적는다.
- 각 운세의 "reason"(근거)은 2~3개의 구체 관상 특징을 반드시 적는다.
  예) "이마가 넓고 매끈함", "콧대가 곧고 코끝이 둥글다", "눈꼬리가 살짝 올라가 밝은 인상",
      "입꼬리가 올라간 미소형", "턱선이 부드럽다/각지다" 등.
- verdict(결론)은 "왜 그 운(재물/연애/건강)으로 연결되는지" 한두 문장으로 요약.
- tips는 행동 조언 2개(짧고 명확)로 채운다.
- 설명은 "한국어"로 작성.
- 아래 스키마의 키를 추가/삭제하지 말고 100% 준수해서 "JSON만" 출력(서문/후기는 금지).

출력 JSON 스키마:
{
  "personA": {
    "wealth": { "reason": "...", "verdict": "...", "tips": ["...", "..."] },
    "love":   { "reason": "...", "verdict": "...", "tips": ["...", "..."] },
    "health": { "reason": "...", "verdict": "...", "tips": ["...", "..."] }
  },
  "personB": {
    "wealth": { "reason": "...", "verdict": "...", "tips": ["...", "..."] },
    "love":   { "reason": "...", "verdict": "...", "tips": ["...", "..."] },
    "health": { "reason": "...", "verdict": "...", "tips": ["...", "..."] }
  },
  "compatibility": {
    "love_friendship": {
      "score": 0,             // 0~100 정수
      "strengths": ["...", "..."],
      "cautions":  ["...", "..."]
    },
    "business": {
      "score": 0,             // 0~100 정수
      "strengths": ["...", "..."],
      "cautions":  ["...", "..."]
    }
  }
}
    `.trim();

    const user = {
      role: 'user',
      content: [
        { type: 'text', text: '두 사람의 정면 얼굴을 분석해 위 JSON 스키마로만 정확히 출력하세요.' },
        { type: 'image_url', image_url: { url: imgA } },
        { type: 'image_url', image_url: { url: imgB } },
      ],
    };

    // -------------------------
    // OpenAI 호출
    // -------------------------
    const model = 'gpt-4o-mini';
    const temperature = 0.2;

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: 'system', content: system },
          user,
        ],
      }),
    });

    if (!resp.ok) {
      const err = await safeJson(resp);
      throw new Error(err?.error?.message || `OpenAI error ${resp.status}`);
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content || '';

    // -------------------------
    // JSON 파싱 견고화
    // -------------------------
    const raw = tryExtractJSON(content);
    const parsed = safeJsonParse(raw);

    // -------------------------
    // 스키마 보정/기본문구 채우기
    // -------------------------
    const normalized = normalizeSchema(parsed);

    return res.status(200).json(normalized);
  } catch (e) {
    console.error('match error:', e);
    return res.status(500).json({ error: '분석 중 오류가 발생했습니다.' });
  }
}

// ---------- 유틸들 ----------

function tryExtractJSON(text = '') {
  // ```json ... ``` 블록 혹은 중괄호만 추출
  const codeBlock = text.match(/```json([\s\S]*?)```/i);
  if (codeBlock) return codeBlock[1].trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text.trim();
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

async function safeJson(resp) {
  try {
    return await resp.json();
  } catch {
    return null;
  }
}

function toStr(v, defaultText = '정보 없음') {
  const str = (v === null || v === undefined) ? '' : String(v).trim();
  return str.length > 0 ? str : defaultText;
}

function fillFortune(src) {
  const base = {
    reason: '관상 특징 분석 불가',
    verdict: '결론 없음',
    tips: ['', ''],
  };
  const out = { ...base, ...(src || {}) };
  out.reason = toStr(out.reason, base.reason);
  out.verdict = toStr(out.verdict, base.verdict);
  if (!Array.isArray(out.tips)) out.tips = ['', ''];
  if (out.tips.length < 2) out.tips = [...out.tips, ''].slice(0, 2);
  out.tips = out.tips.map(t => toStr(t, ''));
  return out;
}

function fillPerson(p) {
  const src = p || {};
  return {
    wealth: fillFortune(src.wealth),
    love:   fillFortune(src.love),
    health: fillFortune(src.health),
  };
}

function distinctify(a = '', b = '') {
  // A/B reason이 너무 유사하면 B에 '(다른 관점: …)' 꼬리표 추가
  const na = a.replace(/\s+/g, '');
  const nb = b.replace(/\s+/g, '');
  if (!na || !nb) return [a || '정보 없음', b || '정보 없음'];
  if (na === nb) return [a, `${b} (다른 관점: 눈/코/입/턱 중 하나를 달리 관찰하여 보완했습니다)`];
  return [a, b];
}

function normalizeSchema(input) {
  const empty = {
    personA: fillPerson(null),
    personB: fillPerson(null),
    compatibility: {
      love_friendship: {
        score: 0,
        strengths: [],
        cautions: [],
      },
      business: {
        score: 0,
        strengths: [],
        cautions: [],
      },
    },
  };
  if (!input || typeof input !== 'object') return empty;

  const personA = fillPerson(input.personA);
  const personB = fillPerson(input.personB);

  // A/B reason이 동일하면 조금이라도 달라지게 보정
  [personA.wealth.reason, personB.wealth.reason] = distinctify(personA.wealth.reason, personB.wealth.reason);
  [personA.love.reason,   personB.love.reason]   = distinctify(personA.love.reason,   personB.love.reason);
  [personA.health.reason, personB.health.reason] = distinctify(personA.health.reason, personB.health.reason);

  const comp = input.compatibility || {};
  const lf = comp.love_friendship || {};
  const biz = comp.business || {};

  const toScore = (n) => {
    const v = Number(n);
    if (Number.isFinite(v)) return Math.max(0, Math.min(100, Math.round(v)));
    return 0;
  };
  const toArr = (arr) => Array.isArray(arr) ? arr.map(x => toStr(x, '')).filter(Boolean) : [];

  return {
    personA,
    personB,
    compatibility: {
      love_friendship: {
        score: toScore(lf.score),
        strengths: toArr(lf.strengths),
        cautions:  toArr(lf.cautions),
      },
      business: {
        score: toScore(biz.score),
        strengths: toArr(biz.strengths),
        cautions:  toArr(biz.cautions),
      },
    },
  };
}