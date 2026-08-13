// =====================================================
//  Vercel 서버리스 함수 - 결혼식 정보 저장
//
//  Supabase 주소와 키는 Vercel 환경변수에서 읽습니다.
//  Vercel 대시보드 > Settings > Environment Variables 에 아래 두 개를 등록하세요.
//    SUPABASE_URL       예) https://abcdefgh.supabase.co
//    SUPABASE_ANON_KEY  eyJ... 로 시작하는 긴 문자열
//
//  키가 브라우저로 전달되지 않기 때문에 소스를 봐도 알 수 없습니다.
// =====================================================

const MAX_NAME_LENGTH = 12;

// SUPABASE_URL 에 끝 슬래시나 /rest/v1 이 붙어 있어도 정상 처리되도록 정리
function normalizeSupabaseUrl(raw) {
  let u = String(raw || '').trim();
  u = u.replace(/\s+/g, '');         // 중간에 낀 공백/줄바꿈 제거
  u = u.replace(/\/+$/, '');         // 끝 슬래시 제거
  u = u.replace(/\/rest\/v1$/i, ''); // 실수로 붙인 /rest/v1 제거
  u = u.replace(/\/+$/, '');
  return u;
}

// 한국 시간(KST) 기준 오늘 날짜를 'YYYY-MM-DD'로 반환
function todayInKST() {
  const nowUtcMs = Date.now();
  const kstMs = nowUtcMs + 9 * 60 * 60 * 1000;
  return new Date(kstMs).toISOString().slice(0, 10);
}

// 두 날짜(YYYY-MM-DD) 사이의 일수 차이 = to - from
function daysBetween(fromISO, toISO) {
  const a = Date.parse(fromISO + 'T00:00:00Z');
  const b = Date.parse(toISO + 'T00:00:00Z');
  return Math.round((b - a) / 86400000);
}

// 'YYYY-MM-DD' 형식이면서 실제로 존재하는 날짜인지 확인
function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms = Date.parse(value + 'T00:00:00Z');
  if (Number.isNaN(ms)) return false;
  // 2026-02-31 처럼 존재하지 않는 날짜를 걸러냅니다
  return new Date(ms).toISOString().slice(0, 10) === value;
}

function cleanName(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > MAX_NAME_LENGTH) return null;
  return trimmed;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const SUPABASE_URL = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();
  const SUPABASE_TABLE = process.env.SUPABASE_TABLE || 'proposals';

  // 환경변수가 아직 등록되지 않았다면 저장만 건너뜁니다 (화면은 정상 동작)
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.status(200).json({ ok: false, skipped: true, reason: 'not_configured' });
    return;
  }

  // Vercel이 JSON 본문을 자동으로 파싱하지만, 문자열로 오는 경우도 대비합니다
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (err) {
      res.status(400).json({ error: 'invalid_json' });
      return;
    }
  }
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'invalid_body' });
    return;
  }

  const groomName = cleanName(body.groom_name);
  const brideName = cleanName(body.bride_name);
  const weddingDate = body.wedding_date;

  if (!groomName || !brideName) {
    res.status(400).json({ error: 'invalid_names' });
    return;
  }
  if (!isValidDate(weddingDate)) {
    res.status(400).json({ error: 'invalid_wedding_date' });
    return;
  }

  // 이용 날짜와 D-day는 서버에서 계산합니다 (기기 시계에 영향받지 않도록)
  const usedDate = todayInKST();
  const daysUntil = daysBetween(usedDate, weddingDate);

  const record = {
    groom_name: groomName,
    bride_name: brideName,
    wedding_date: weddingDate,
    used_date: usedDate,
    days_until: daysUntil,
    is_estimated: body.is_estimated === true
  };

  try {
    const response = await fetch(SUPABASE_URL + '/rest/v1/' + SUPABASE_TABLE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(record)
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Supabase 저장 실패:', response.status, detail);
      res.status(502).json({ error: 'supabase_error', status: response.status });
      return;
    }

    res.status(200).json({
      ok: true,
      used_date: usedDate,
      days_until: daysUntil
    });
  } catch (err) {
    console.error('저장 중 오류:', err);
    res.status(500).json({ error: 'unexpected_error' });
  }
};
