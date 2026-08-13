// =====================================================
//  진단용 엔드포인트
//
//  배포된 주소 뒤에 /api/health 를 붙여서 브라우저로 열면
//  무엇이 잘못됐는지 알려줍니다.
//    예) https://ex-260813-awjy.vercel.app/api/health
//
//  키 값 자체는 절대 출력하지 않습니다. (등록 여부와 길이만 표시)
// =====================================================

module.exports = async (req, res) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  const table = process.env.SUPABASE_TABLE || 'proposals';

  const report = {
    확인시각: new Date().toISOString(),
    환경변수: {
      SUPABASE_URL: url ? '등록됨' : '없음  <-- 문제',
      SUPABASE_ANON_KEY: key ? ('등록됨 (' + key.length + '자)') : '없음  <-- 문제',
      SUPABASE_TABLE: table
    },
    진단: [],
    결론: ''
  };

  // 1) 환경변수 등록 여부
  if (!url || !key) {
    report.진단.push('Vercel 환경변수가 서버에서 보이지 않습니다.');
    report.진단.push('Vercel > Settings > Environment Variables 에 등록했는지 확인하세요.');
    report.진단.push('등록했다면 Deployments > 맨 위 배포 > ... > Redeploy 를 눌러야 반영됩니다.');
    report.결론 = '환경변수 미등록 또는 재배포 안 함';
    res.status(200).json(report);
    return;
  }

  // 2) URL 형식 확인
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url.trim())) {
    report.진단.push('SUPABASE_URL 형식이 이상합니다. https://xxxx.supabase.co 형태여야 합니다.');
    report.진단.push('현재 값의 시작 부분: ' + url.slice(0, 12) + '...');
    report.진단.push('끝에 슬래시(/)나 /rest/v1 같은 경로가 붙어있지 않은지 확인하세요.');
  }

  // 3) 키 앞뒤 공백 확인 (복사할 때 자주 생기는 실수)
  if (key !== key.trim()) {
    report.진단.push('SUPABASE_ANON_KEY 앞뒤에 공백이나 줄바꿈이 들어있습니다. 다시 등록하세요.');
  }

  // 4) 실제로 Supabase에 연결해봅니다
  const base = url.trim().replace(/\/+$/, '');
  try {
    const probe = await fetch(base + '/rest/v1/' + table + '?limit=1', {
      method: 'GET',
      headers: {
        'apikey': key.trim(),
        'Authorization': 'Bearer ' + key.trim()
      }
    });

    const text = await probe.text();
    report.Supabase응답 = { 상태코드: probe.status };

    if (probe.status === 200) {
      report.진단.push('Supabase 연결 성공. 테이블도 존재합니다.');
      report.결론 = '설정 정상 — 저장이 동작해야 합니다';
    } else if (probe.status === 401 || probe.status === 403) {
      report.진단.push('키가 거부되었습니다 (401/403).');
      report.진단.push('anon public 키가 맞는지, 다른 프로젝트의 키를 넣지 않았는지 확인하세요.');
      report.결론 = 'ANON KEY 오류';
    } else if (probe.status === 404) {
      report.진단.push('테이블 "' + table + '" 을 찾을 수 없습니다 (404).');
      report.진단.push('supabase_setup.sql 을 SQL Editor에서 실행했는지 확인하세요.');
      report.결론 = '테이블 없음';
    } else {
      report.진단.push('예상치 못한 응답입니다.');
      report.Supabase응답.본문 = text.slice(0, 300);
      report.결론 = '알 수 없는 오류 (상태코드 ' + probe.status + ')';
    }
  } catch (err) {
    report.진단.push('Supabase 서버에 연결하지 못했습니다: ' + err.message);
    report.진단.push('SUPABASE_URL 주소가 정확한지 확인하세요.');
    report.결론 = '연결 실패';
  }

  res.status(200).json(report);
};
