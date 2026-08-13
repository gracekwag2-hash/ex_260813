-- =====================================================
--  고백 서비스 - Supabase 테이블 설정
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 Run 하세요.
-- =====================================================

-- 1) 테이블 생성
create table if not exists public.proposals (
  id           bigint generated always as identity primary key,

  groom_name   text        not null,   -- 신랑 이름
  bride_name   text        not null,   -- 신부 이름
  wedding_date date        not null,   -- 결혼식 날짜
  used_date    date        not null,   -- 서비스를 사용한 날짜
  days_until   integer     not null,   -- 결혼식 날짜 - 이용 날짜 (일수)
  is_estimated boolean     not null default false,  -- 예상 날짜 여부

  created_at   timestamptz not null default now()
);

comment on table  public.proposals              is '고백 서비스 사용 기록';
comment on column public.proposals.groom_name   is '신랑 이름';
comment on column public.proposals.bride_name   is '신부 이름';
comment on column public.proposals.wedding_date is '결혼식 날짜';
comment on column public.proposals.used_date    is '서비스 이용 날짜';
comment on column public.proposals.days_until   is '결혼식까지 남은 일수 (음수면 이미 지난 날짜)';
comment on column public.proposals.is_estimated is '아직 확정되지 않은 예상 날짜인지 여부';


-- 2) 행 수준 보안(RLS) 활성화
--    켜두지 않으면 anon key로 테이블 전체를 읽고 수정할 수 있습니다.
alter table public.proposals enable row level security;


-- 3) 정책: 누구나 INSERT만 가능 (조회/수정/삭제는 불가)
--    웹페이지는 기록만 남기면 되므로 INSERT 권한만 열어둡니다.
--    데이터 확인은 대시보드의 Table Editor에서 하세요.
drop policy if exists "anyone can insert proposals" on public.proposals;

create policy "anyone can insert proposals"
  on public.proposals
  for insert
  to anon
  with check (
    char_length(groom_name) between 1 and 12
    and char_length(bride_name) between 1 and 12
    and wedding_date between '1900-01-01' and '2200-01-01'
  );


-- =====================================================
--  참고: 저장된 데이터 확인용 쿼리
-- =====================================================
-- select
--   groom_name  as 신랑,
--   bride_name  as 신부,
--   wedding_date as 결혼식날짜,
--   used_date    as 이용날짜,
--   days_until   as 남은일수,
--   is_estimated as 예상날짜여부,
--   created_at   as 기록시각
-- from public.proposals
-- order by created_at desc;
