async function handleShare(result, type) {
  try {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result, type })
    });

    const data = await res.json();
    if (data.url) {
      await navigator.clipboard.writeText(data.url);
      alert('공유 링크가 복사되었습니다!');
    }
  } catch (err) {
    console.error(err);
    alert('링크 생성 실패');
  }
}
