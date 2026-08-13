# Supabase 설정 방법

결혼식 날짜 기록을 저장하려면 설정이 한 번 필요합니다.
전부 무료이고, 10분이면 끝나요.

> 설정을 안 해도 사이트는 정상 작동합니다. 저장만 건너뛸 뿐이에요.

**주소와 키는 Vercel 환경변수에 넣습니다.** 코드 파일에는 비밀값이 들어가지 않으니
GitHub에 올라가도 안전해요.

---

## 1단계 · Supabase 프로젝트 만들기

1. [supabase.com](https://supabase.com) 접속 → **Start your project** 클릭
2. GitHub 계정으로 로그인 (이미 GitHub 쓰고 계시니 제일 간편해요)
3. **New project** 클릭 후 아래 값을 채웁니다
   - **Name**: `proposal` (아무 이름이나 괜찮아요)
   - **Database Password**: 아무 비밀번호나 넣고 **따로 메모해두세요**
   - **Region**: `Northeast Asia (Seoul)` 선택
4. **Create new project** 클릭 → 2분 정도 기다리면 준비 완료

---

## 2단계 · 테이블 만들기

1. 왼쪽 메뉴에서 **SQL Editor** (터미널 모양 아이콘) 클릭
2. **New query** 클릭
3. 같은 폴더에 있는 **`supabase_setup.sql`** 파일을 메모장으로 열어서
   내용을 **전부 복사** → 편집기에 붙여넣기
4. 오른쪽 아래 **Run** 클릭
5. `Success. No rows returned` 가 뜨면 성공입니다

---

## 3단계 · 주소와 키 복사하기

1. 왼쪽 아래 **Project Settings** (톱니바퀴) 클릭
2. **Data API** 메뉴 클릭
3. 아래 두 가지를 복사해둡니다
   - **Project URL** — `https://xxxxxxxx.supabase.co` 형태
   - **anon public** 키 — `eyJ...` 로 시작하는 아주 긴 문자열

메모장에 잠깐 붙여두면 다음 단계가 편해요.

---

## 4단계 · Vercel 환경변수에 등록하기

1. [vercel.com](https://vercel.com) 접속 → `ex-260813-awjy` 프로젝트 클릭
2. 위쪽 **Settings** 탭 클릭
3. 왼쪽 메뉴에서 **Environment Variables** 클릭
4. 아래 두 개를 하나씩 등록합니다

| Key | Value |
|---|---|
| `SUPABASE_URL` | 3단계의 Project URL |
| `SUPABASE_ANON_KEY` | 3단계의 anon public 키 |

각각 이렇게 하세요.

- **Key** 칸에 위 이름을 **오타 없이** 그대로 입력
- **Value** 칸에 복사한 값 붙여넣기
- 환경(Environment)은 **Production, Preview, Development 모두 체크**
- **Save** 클릭

5. 두 개를 다 등록했으면 위쪽 **Deployments** 탭으로 이동
6. 맨 위 배포의 오른쪽 **···** 메뉴 → **Redeploy** 클릭

> 환경변수는 새로 배포해야 반영됩니다. 이 단계를 빠뜨리면 저장이 안 돼요.

---

## 5단계 · 잘 되는지 확인

1. 배포된 사이트에 들어가 이름을 넣고 **먼저 체험해보기** 클릭
2. **좋아!!** 누르고 날짜를 넣은 뒤 저장 → `저장 완료!` 문구 확인
3. Supabase 왼쪽 메뉴 **Table Editor** → `proposals` 테이블 클릭
4. 방금 넣은 데이터가 한 줄 들어와 있으면 성공 🎉

---

## 저장되는 항목

| 컬럼 | 설명 | 예시 |
|---|---|---|
| `groom_name` | 신랑 이름 | 은한 |
| `bride_name` | 신부 이름 | 혜원 |
| `wedding_date` | 결혼식 날짜 | 2027-05-15 |
| `used_date` | 서비스 이용 날짜 | 2026-08-13 |
| `days_until` | 결혼식까지 남은 일수 | 275 |
| `is_estimated` | 예상 날짜인지 여부 | false |
| `created_at` | 기록된 시각 | 자동 입력 |

`used_date` 와 `days_until` 은 **서버에서 한국 시간 기준으로 계산**합니다.
사용자 기기의 시계가 틀려도 정확하게 기록돼요.

---

## 알아두면 좋은 점

**키가 노출될 걱정은 없나요?**
없습니다. 주소와 키는 Vercel 서버 안에서만 쓰이고 브라우저로 내려가지 않아요.
사이트 소스를 열어봐도 `/api/save-proposal` 이라는 주소만 보입니다.
여기에 더해 `supabase_setup.sql` 에서 RLS(행 수준 보안)를 켜고
**INSERT만 허용**하도록 막아두었습니다.

**데이터는 어디서 보나요?**
Supabase 대시보드의 **Table Editor** 에서 봅니다.
사이트에서는 조회가 안 되도록 막혀 있어요.

**날짜를 안 정한 커플은요?**
`is_estimated` 가 `true` 로 저장됩니다. 예상 날짜와 확정 날짜를 구분할 수 있어요.

**내 컴퓨터에서 index.html을 직접 열면요?**
`/api` 주소가 없어서 저장은 건너뛰고 화면만 정상 동작합니다.
저장까지 확인하려면 배포된 주소로 접속하세요.
