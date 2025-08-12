```javascript
import React, { useState } from 'react';

export default function FaceMatchApp() {
  const [result, setResult] = useState(null);

  const analyzeFaces = async () => {
    // 기존 분석 로직...
    const response = await fetch('/api/analyze', { method: 'POST', body: formData });
    const data = await response.json();
    setResult(data);
  };

  const handleShare = async () => {
    if (!result) {
      alert('먼저 분석을 완료해주세요.');
      return;
    }
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result }),
      });
      if (!res.ok) throw new Error('링크 생성 실패');
      const { url } = await res.json();
      await navigator.clipboard.writeText(url);
      alert('공유 링크가 복사되었습니다!');
    } catch (error) {
      console.error(error);
      alert('링크 생성 실패: ' + error.message);
    }
  };

  return (
    <div>
      {/* 기존 UI 코드 */}
      <button onClick={analyzeFaces}>관상궁합 분석하기</button>
      <button onClick={handleShare}>공유 링크 복사</button>
    </div>
  );
}
```
