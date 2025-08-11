export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).json({ error:'Method not allowed' });
  try{
    const { imgA, imgB } = req.body || {};
    if(!imgA || !imgB) return res.status(400).json({ error:'imgA and imgB are required' });
    if(!process.env.OPENAI_API_KEY) return res.status(500).json({ error:'OPENAI_API_KEY is missing' });

    const system = [
      '역할: 당신은 재미있는 "관상 궁합 해설가"입니다. 이 결과는 오락용/참고용임을 인지하고 존중/비차별적 언어를 사용합니다.',
      '두 얼굴 이미지를 보고 얼굴형, 이마/눈썹/눈/코/입/턱선/비율/표정 인상 등을 안전하게 서술하세요.',
      '각 개인의 특징을 긍정/중립 어휘로 요약하고, 궁합 요소(에너지 밸런스, 소통 스타일, 협력 포인트)를 설명하세요.',
      '마지막으로 0~100 사이의 궁합 점수를 제시하세요. 과도한 확신 표현은 피하십시오.',
      '항상 JSON 객체로만 답하세요. 키: score, personA{traits,analysis}, personB{traits,analysis}, compatibility{summary,tips}'
    ].join('\n');

    const payload = {
      model: 'gpt-4o-mini',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role:'system', content: system },
        { role:'user', content:[
            { type:'text', text:'아래 두 얼굴 사진을 바탕으로 JSON 형식으로 관상 궁합을 설명해 주세요.' },
            { type:'image_url', image_url:{ url: imgA } },
            { type:'image_url', image_url:{ url: imgB } }
        ]}
      ]
    };

    const r = await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify(payload)
    });

    if(!r.ok){ const t = await r.text(); return res.status(500).json({ error:'OpenAI error', detail:t }); }
    const data = await r.json();
    let json = {};
    try{ json = JSON.parse(data.choices?.[0]?.message?.content || '{}'); }
    catch{ json = { error:'Invalid JSON from model' }; }
    return res.status(200).json(json);
  }catch(e){
    return res.status(500).json({ error: e?.message || 'Unknown error' });
  }
}
