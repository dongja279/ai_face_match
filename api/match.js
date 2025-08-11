<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>AI 관상궁합 — 두 사진으로 보는 우리 사이</title>
  <style>
    :root{
      --bg:#0e1116; --panel:#141922; --panel2:#0f1520; --ink:#e8eef7;
      --muted:#9fb1c8; --line:#1f2937; --chip:#1b2230;
      --accent:#8b5cf6; --accent2:#06b6d4; --ok:#22c55e; --warn:#f59e0b;
    }
    @media (prefers-color-scheme: light){
      :root{
        --bg:#f7f9fc; --panel:#ffffff; --panel2:#ffffff; --ink:#202734;
        --muted:#667085; --line:#e7edf5; --chip:#f2f6fc;
        --accent:#6d28d9; --accent2:#0891b2; --ok:#16a34a; --warn:#d97706;
      }
    }
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;background:var(--bg);color:var(--ink);
      font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",Segoe UI,Roboto,Helvetica,Arial}
    header{position:sticky;top:0;z-index:10;background:linear-gradient(90deg,#131a25cc,#0f1520cc);
      border-bottom:1px solid #ffffff14;color:#fff;backdrop-filter:blur(8px)}
    .container{max-width:820px;margin:0 auto;padding:16px}
    .brand{display:flex;gap:12px;align-items:center}
    .logo{width:36px;height:36px;border-radius:50%;background:conic-gradient(from 140deg,var(--accent),var(--accent2))}
    .brand h1{margin:0;font-size:18px}
    .brand small{display:block;color:#cfe1ff}
    main{max-width:820px;margin:16px auto;padding:0 12px;display:grid;gap:16px}

    .card{background:linear-gradient(180deg,var(--panel),var(--panel2));border:1px solid var(--line);
      border-radius:16px;padding:16px}
    .card h2{margin:0 0 10px;color:#b8c3d6;font-size:14px;letter-spacing:.2px}

    /* 업로드 영역 */
    .upload-grid{display:grid;grid-template-columns:1fr;gap:10px}
    @media(min-width:640px){ .upload-grid{grid-template-columns:1fr 1fr} }
    .btn{cursor:pointer;border:none;border-radius:14px;padding:16px 14px;font-weight:800;letter-spacing:.3px}
    .btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff}
    .btn-outline{background:var(--chip);color:var(--ink);border:1px solid var(--line)}
    .btn:disabled{opacity:.6;cursor:not-allowed}

    .meter{height:8px;background:#0f1623;border-radius:999px;overflow:hidden;border:1px solid #ffffff16;margin-top:12px}
    .meter>div{height:100%;width:0%;background:linear-gradient(90deg,#22d3ee,#a78bfa,#22c55e)}

    .thumbs{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
    .thumb{position:relative;border-radius:14px;overflow:hidden;border:1px solid #ffffff1a;background:#0f172a;height:56vw;max-height:420px}
    @media(min-width:640px){ .thumb{height:48vw;max-height:420px} }
    .thumb img{width:100%;height:100%;object-fit:cover;display:block}

    .actions{display:grid;grid-template-columns:1fr;gap:10px;margin-top:12px}
    @media(min-width:520px){ .actions{grid-template-columns:1.2fr .8fr} }

    /* 결과 섹션 */
    .result{display:grid;gap:12px}
    .score{display:flex;align-items:center;gap:12px}
    .badge{min-width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-weight:900;font-size:20px;box-shadow:0 6px 18px #00000033}
    .pill{padding:6px 10px;border-radius:999px;background:#0f1623;color:#e7efff;border:1px solid #ffffff17;font-size:12px}
    .section{border:1px solid #ffffff17;border-radius:14px;background:#0f1623;padding:14px}
    .section h3{margin:0 0 8px;font-size:14px;color:#cbd5e1}
    .pair{display:grid;grid-template-columns:1fr;gap:12px}
    @media(min-width:640px){ .pair{grid-template-columns:1fr 1fr} }
    .who{border:1px solid #ffffff17;border-radius:12px;background:#0f1623;padding:12px}
    .who h4{margin:0 0 6px;font-size:13px;color:#bcd1ff}
    .list{margin:8px 0 0 0;padding:0 0 0 16px}
    .list li{margin:4px 0}

    .muted{color:var(--muted);font-size:12px}
    footer{max-width:820px;margin:4px auto 24px;padding:0 12px;color:var(--muted);font-size:12px;text-align:center}
    footer a{color:inherit}
  </style>
</head>
<body>
  <header>
    <div class="container brand">
      <div class="logo" aria-hidden="true"></div>
      <div>
        <h1>AI 관상궁합</h1>
        <small>두 사람의 얼굴 사진으로 보는 우리 사이 — 재미로만 보세요!</small>
      </div>
    </div>
  </header>

  <main>
    <!-- 업로드 -->
    <section class="card">
      <h2>사진 업로드</h2>
      <div class="upload-grid">
        <div>
          <input id="fileA" type="file" accept="image/*" hidden>
          <button id="btnA" class="btn btn-primary" type="button">👤 A 사진 업로드</button>
        </div>
        <div>
          <input id="fileB" type="file" accept="image/*" hidden>
          <button id="btnB" class="btn btn-primary" type="button">👤 B 사진 업로드</button>
        </div>
      </div>

      <div class="meter"><div id="bar"></div></div>
      <div id="status" class="muted" style="margin-top:6px">대기 중…</div>

      <div class="thumbs">
        <div class="thumb"><img id="imgPreviewA" alt="A 미리보기"></div>
        <div class="thumb"><img id="imgPreviewB" alt="B 미리보기"></div>
      </div>

      <div class="actions">
        <button id="analyze" class="btn btn-primary">🔮 관상궁합 분석하기</button>
        <button id="copy" class="btn btn-outline">📋 분석 결과 복사하기</button>
      </div>
    </section>

    <!-- 결과 -->
    <section class="card">
      <h2>결과</h2>
      <div id="out" class="result">
        <div class="muted">아직 결과가 없습니다.</div>
      </div>
      <div class="muted" style="margin-top:6px">(※ 오락/참고용 결과입니다. 사진은 저장되지 않습니다.)</div>
    </section>
  </main>

  <footer>문의: <a href="mailto:dongja279@gmail.com">dongja279@gmail.com</a></footer>

  <script>
    // ===== DOM =====
    const q = id => document.getElementById(id);
    const fileA=q('fileA'), fileB=q('fileB');
    const btnA=q('btnA'), btnB=q('btnB'), analyze=q('analyze'), copyBtn=q('copy');
    const bar=q('bar'), statusEl=q('status'), out=q('out');
    const imgPA=q('imgPreviewA'), imgPB=q('imgPreviewB');

    let imgA=null, imgB=null, busy=false;

    btnA.onclick=()=>fileA.click();
    btnB.onclick=()=>fileB.click();

    fileA.onchange=e=>readPreview(e.target.files?.[0],'A');
    fileB.onchange=e=>readPreview(e.target.files?.[0],'B');

    copyBtn.onclick=async()=>{
      try{
        const plain = out.innerText.trim();
        if(!plain){ alert('복사할 결과가 없습니다.'); return; }
        await navigator.clipboard.writeText(plain);
        copyBtn.textContent='✅ 복사됨';
        setTimeout(()=>copyBtn.textContent='📋 분석 결과 복사하기',1200);
      }catch(_){ alert('복사 권한을 확인해주세요.');}
    };

    function setBusy(b,msg){
      busy=b; statusEl.textContent=b?(msg||'분석 중…'):'대기 중…';
      bar.style.width=b?'70%':'0%';
      [analyze,btnA,btnB,copyBtn].forEach(el=>el.disabled=b);
    }

    function readPreview(file,who){
      if(!file) return;
      const r=new FileReader();
      r.onload=ev=>compress(ev.target.result, who);
      r.readAsDataURL(file);
    }

    function compress(src,who){
      const img=new Image();
      img.onload=()=>{
        const max=540; const scale=Math.min(1, max/Math.max(img.width,img.height));
        const c=document.createElement('canvas'); c.width=img.width*scale; c.height=img.height*scale;
        const ctx=c.getContext('2d'); ctx.drawImage(img,0,0,c.width,c.height);
        const data=c.toDataURL('image/jpeg',0.85);
        if(who==='A'){ imgA=data; imgPA.src=data; }
        else { imgB=data; imgPB.src=data; }
      }; img.src=src;
    }

    analyze.onclick=async()=>{
      if(!imgA||!imgB){ alert('A, B 사진을 모두 업로드해 주세요.'); return; }
      try{
        setBusy(true,'관상궁합 분석 중…'); out.innerHTML='<div class="muted">분석 중…</div>';
        const res=await fetch('/api/match',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ imgA, imgB }) });
        if(!res.ok){ const t=await res.text(); throw new Error(`HTTP ${res.status}: ${t}`); }
        const d=await res.json();
        out.innerHTML = renderHTML(d);
        bar.style.width='100%'; statusEl.textContent='완료!';
      }catch(e){ out.innerHTML=`<div class="section">에러: ${e?.message||e}</div>`; }
      finally{ setBusy(false); }
    };

    /* ========== 렌더링 ========== */
    function renderHTML(d){
      // helper
      const safe = v => (v==null?'':String(v));
      const list = arr => {
        if(!arr) return '';
        const a = Array.isArray(arr) ? arr : [arr];
        return a.filter(Boolean).map(x=>`<li>${safe(x)}</li>`).join('');
      };
      const featureList = obj => {
        if(!obj) return '';
        const m = {
          face_shape:'얼굴형', forehead:'이마', eyebrows:'눈썹', eyes:'눈', nose:'코',
          mouth_lips:'입/입술', ears:'귀', jaw_chin:'턱/턱선', skin_expression:'피부/표정'
        };
        return Object.entries(obj)
          .filter(([,v])=>v!=null && String(v).trim()!=='')
          .map(([k,v])=>`<li><b>${m[k]||k}</b>: ${safe(v)}</li>`).join('');
      };

      const score = `
        <div class="section">
          <div class="score">
            <div class="badge">${d.score ?? '?'}</div>
            <div>
              <div><b>✨ 궁합 점수</b></div>
              <div class="pill">${safe(d.score_reason)||'점수 근거: 사진에서 관찰된 요소 기반 요약'}</div>
            </div>
          </div>
        </div>`;

      const A = d.personA||d.person1||{};
      const B = d.personB||d.person2||{};

      const person = (label, data) => `
        <div class="who">
          <h4>${label}</h4>
          ${data.summary?`<div>${safe(data.summary)}</div>`:''}
          ${data.features?`<ul class="list">${featureList(data.features)}</ul>`:
            `<ul class="list">${featureList({
              face_shape:data.face_shape, forehead:data.forehead, eyebrows:data.eyebrows, eyes:data.eyes,
              nose:data.nose, mouth_lips:data.mouth||data.mouth_lips, ears:data.ears, jaw_chin:data.jaw_chin, skin_expression:data.skin_expression
            })}</ul>`}
          ${data.analysis?`<div style="margin-top:6px"><b>풀이:</b> ${safe(data.analysis)}</div>`:''}
        </div>`;

      const individuals = `
        <div class="section">
          <h3>👥 개인별 관상 특징</h3>
          <div class="pair">
            ${person('A', A)}
            ${person('B', B)}
          </div>
        </div>`;

      const compat = d.compatibility||{};
      const compatHTML = `
        <div class="section">
          <h3>🔗 궁합 해석</h3>
          ${compat.summary?`<div style="margin-bottom:6px">${safe(compat.summary)}</div>`:''}
          ${compat.strengths?`<div style="margin-top:8px"><b>🤝 잘 맞는 점</b><ul class="list">${list(compat.strengths)}</ul></div>`:''}
          ${compat.cautions?`<div style="margin-top:8px"><b>⚠️ 조심해야 할 점</b><ul class="list">${list(compat.cautions)}</ul></div>`:''}
          ${compat.tips?`<div style="margin-top:8px"><b>💡 Tip</b><ul class="list">${list(compat.tips)}</ul></div>`:''}
        </div>`;

      return `${score}${individuals}${compatHTML}`;
    }
  </script>
</body>
</html>
