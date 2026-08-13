// =====================================================
//  진단용 엔드포인트
//
//  배포된 주소 뒤에 /api/health 를 붙여서 브라우저로 열면
//  무엇이 잘못됐는지 알려줍니다.
//    예) https://ex-260813-awjy.vercel.app/api/health
//
//  키 값 자체는 절대 출력하지 않습니다. (등록 여부와 길이만 표시)
// =====================================================

// SUPABASE_URL 에 끝 슬래시나 /rest/v1 이 붙어 있어도 정상 처리되도록 정리
function normalizeSupabaseUrl(raw) {
  let u = String(raw || '').trim();
  u = u.replace(/\s+/g, '');       // 중간에 낀 공백/줄바꿈 제거
  u = u.replace(/\/+$/, '');       // 끝 슬래시 제거
  u = u.replace(/\/rest\/v1$/i, ''); // 실수로 붙인 /rest/v1 제거
  u = u.replace(/\/+$/, '');
  return u;
}

module.exports = async (req, res) => {
  const rawUrl = process.env.SUPABASE_URL;
  const rawKey = process.env.SUPABASE_ANON_KEY;
  const table = process.env.SUPABASE_TABLE || 'proposals';

  const report = {
    확인시각: new Date().toISOString(),
    환경변수: {
      SUPABASE_URL: rawUrl ? '등록됨' : '없음  <-- 문제',
      SUPABASE_ANON_KEY: rawKey ? ('등록됨 (' + rawKey.length + '자)') : '없음  <-- 문제',
      SUPABASE_TABLE: table
    },
    진단: [],
    결론: ''
  };

  // 1) 환경변수 등록 여부
  if (!rawUrl || !rawKey) {
    report.진단.push('Vercel 환경변수가 서버에서 보이지 않습니다.');
    report.진단.push('Vercel > Settings > Environment Variables 에 등록했는지 확인하세요.');
    report.진단.push('등록했다면 Deployments > 맨 위 배포 > ... > Redeploy 를 눌러야 반영됩니다.');
    report.결론 = '환경변수 미등록 또는 재배포 안 함';
    res.status(200).json(report);
    return;
  }

  const url = normalizeSupabaseUrl(rawUrl);
  const key = rawKey.trim();

  // 2) URL 구조 분석 (호스트만 보여주고 전체 값은 노출하지 않음)
  let host = null;
  let strayPath = null;
  try {
    const parsed = new URL(url);
    host = parsed.host;
    strayPath = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : null;
  } catch (err) {
    report.진단.push('SUPABASE_URL 을 주소로 해석할 수 없습니다. https:// 로 시작하는지 확인하세요.');
    report.결론 = 'URL 형식 오류';
    res.status(200).json(report);
    return;
  }

  report.주소분석 = {
    호스트: host,
    supabase주소형태: /^[a-z0-9-]+\.supabase\.(co|in)$/i.test(host) ? '정상' : '이상함',
    불필요한경로: strayPath || '없음',
    원본에_경로가_있었는지: rawUrl.trim().replace(/^https?:\/\/[^/]+/i, '').replace(/\/+$/, '') || '없음'
  };

  if (strayPath) {
    report.진단.push('SUPABASE_URL 에 불필요한 경로(' + strayPath + ')가 붙어 있습니다. 호스트 주소만 넣어주세요.');
  }
  if (rawKey !== rawKey.trim()) {
    report.진단.push('SUPABASE_ANON_KEY 앞뒤에 공백이나 줄바꿈이 들어있습니다. 다시 등록하세요.');
  }

  const authHeaders = { 'apikey': key, 'Authorization': 'Bearer ' + key };

  // 3) 먼저 REST 루트를 조회해 "주소·키" 자체가 맞는지 확인합니다
  let rootStatus = null;
  try {
    const rootRes = await fetch(url + '/rest/v1/', { method: 'GET', headers: authHeaders });
    rootStatus = rootRes.status;
  } catch (err) {
    report.진단.push('Supabase 서버에 연결하지 못했습니다: ' + err.message);
    report.결론 = '연결 실패 — SUPABASE_URL 주소를 확인하세요';
    res.status(200).json(report);
    return;
  }

  // 4) 그 다음 테이블을 조회합니다
  let tableStatus = null;
  let tableBody = '';
  try {
    const tRes = await fetch(url + '/rest/v1/' + table + '?limit=1', {
      method: 'GET',
      headers: authHeaders
    });
    tableStatus = tRes.status;
    tableBody = (await tRes.text()).slice(0, 300);
  } catch (err) {
    report.진단.push('테이블 조회 중 오류: ' + err.message);
  }

  report.Supabase응답 = { REST루트: rootStatus, 테이블: tableStatus };

  // 5) 두 결과를 조합해 원인을 특정합니다
  if (rootStatus === 401 || rootStatus === 403) {
    report.진단.push('키가 거부되었습니다 (' + rootStatus + ').');
    report.진단.push('Supabase > Project Settings > Data API 의 anon public 키가 맞는지 확인하세요.');
    report.진단.push('다른 프로젝트의 키를 넣었을 가능성도 확인해보세요.');
    report.결론 = 'ANON KEY 오류';
  } else if (rootStatus === 404) {
    report.진단.push('REST 루트조차 404입니다. SUPABASE_URL 주소가 잘못되었습니다.');
    report.진단.push('Supabase > Project Settings > Data API 의 Project URL 을 그대로 복사해 넣으세요.');
    report.결론 = 'SUPABASE_URL 오류';
  } else if (tableStatus === 200) {
    report.진단.push('모든 설정이 정상입니다. 주소·키·테이블 모두 확인되었습니다.');
    report.결론 = '설정 정상 — 저장이 동작해야 합니다';
  } else if (tableStatus === 404) {
    report.진단.push('주소와 키는 정상입니다. 다만 테이블 "' + table + '" 이 없습니다.');
    report.진단.push('Supabase > SQL Editor 에서 supabase_setup.sql 내용을 실행하세요.');
    report.진단.push('이미 실행했다면 테이블 이름이 정확히 "' + table + '" 인지 확인하세요.');
    report.응답본문 = tableBody;
    report.결론 = '테이블 없음 — supabase_setup.sql 을 실행하세요';
  } else if (tableStatus === 401 || tableStatus === 403) {
    report.진단.push('테이블 접근이 거부되었습니다. RLS 정책 문제일 수 있습니다.');
    report.진단.push('다만 저장(INSERT)만 열어둔 설정이라면 정상일 수 있습니다.');
    report.응답본문 = tableBody;
    report.결론 = '테이블 권한 확인 필요';
  } else {
    report.진단.push('예상치 못한 응답입니다.');
    report.응답본문 = tableBody;
    report.결론 = '알 수 없는 오류 (루트 ' + rootStatus + ', 테이블 ' + tableStatus + ')';
  }

  res.status(200).json(report);
};
