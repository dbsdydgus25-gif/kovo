-- ========================================
-- 민심 (Minsim) - Korea Political Vote Platform
-- Supabase Schema
-- ========================================

create extension if not exists "uuid-ossp";

-- ========================================
-- PROFILES (사용자 프로필 + 인구통계)
-- ========================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  age_group text check (age_group in ('10대', '20대', '30대', '40대', '50대', '60대이상')),
  gender text check (gender in ('남성', '여성', '기타', '응답거부')),
  region text,
  occupation text,
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ========================================
-- ISSUES (정치 논제/안건)
-- ========================================
create table public.issues (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  summary text not null,
  description text,
  category text default '정치',
  party text default '공통',
  bill_no text,
  assembly_session int,
  status text default 'active' check (status in ('active', 'closed', 'pending')),
  source_url text,
  pro_summary text,
  con_summary text,
  api_data jsonb,
  agree_count int default 0,
  disagree_count int default 0,
  comment_count int default 0,
  featured boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ========================================
-- VOTES (찬반 투표)
-- ========================================
create table public.votes (
  id uuid default uuid_generate_v4() primary key,
  issue_id uuid references public.issues on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  vote_type text check (vote_type in ('agree', 'disagree')) not null,
  age_group text,
  gender text,
  region text,
  occupation text,
  created_at timestamptz default now(),
  unique(issue_id, user_id)
);

-- ========================================
-- COMMENTS (익명 댓글)
-- ========================================
create table public.comments (
  id uuid default uuid_generate_v4() primary key,
  issue_id uuid references public.issues on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  content text not null,
  vote_type text check (vote_type in ('agree', 'disagree')),
  likes int default 0,
  is_deleted boolean default false,
  created_at timestamptz default now()
);

create table public.comment_likes (
  comment_id uuid references public.comments on delete cascade,
  user_id uuid references auth.users on delete cascade,
  primary key (comment_id, user_id)
);

-- ========================================
-- INDEXES
-- ========================================
create index votes_issue_id_idx on public.votes(issue_id);
create index votes_user_id_idx on public.votes(user_id);
create index comments_issue_id_idx on public.comments(issue_id);
create index issues_status_idx on public.issues(status);
create index issues_category_idx on public.issues(category);
create index issues_created_at_idx on public.issues(created_at desc);

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================
alter table public.profiles enable row level security;
alter table public.issues enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;

create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

create policy "issues_select" on public.issues for select using (true);

create policy "votes_select" on public.votes for select using (true);
create policy "votes_insert" on public.votes for insert with check (auth.uid() = user_id);
create policy "votes_update" on public.votes for update using (auth.uid() = user_id);

create policy "comments_select" on public.comments for select using (not is_deleted);
create policy "comments_insert" on public.comments for insert with check (auth.uid() = user_id);
create policy "comments_update" on public.comments for update using (auth.uid() = user_id);

create policy "likes_select" on public.comment_likes for select using (true);
create policy "likes_insert" on public.comment_likes for insert with check (auth.uid() = user_id);
create policy "likes_delete" on public.comment_likes for delete using (auth.uid() = user_id);

-- ========================================
-- TRIGGERS & FUNCTIONS
-- ========================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.update_vote_counts()
returns trigger language plpgsql security definer as $$
begin
  if (TG_OP = 'INSERT') then
    if new.vote_type = 'agree' then
      update public.issues set agree_count = agree_count + 1 where id = new.issue_id;
    else
      update public.issues set disagree_count = disagree_count + 1 where id = new.issue_id;
    end if;
  elsif (TG_OP = 'UPDATE') then
    if new.vote_type = 'agree' and old.vote_type = 'disagree' then
      update public.issues set agree_count = agree_count + 1, disagree_count = disagree_count - 1 where id = new.issue_id;
    elsif new.vote_type = 'disagree' and old.vote_type = 'agree' then
      update public.issues set agree_count = agree_count - 1, disagree_count = disagree_count + 1 where id = new.issue_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger on_vote_change
  after insert or update on public.votes
  for each row execute procedure public.update_vote_counts();

create or replace function public.update_comment_count()
returns trigger language plpgsql security definer as $$
begin
  update public.issues set comment_count = comment_count + 1 where id = new.issue_id;
  return new;
end;
$$;

create trigger on_comment_insert
  after insert on public.comments
  for each row execute procedure public.update_comment_count();

-- ========================================
-- SEED DATA (샘플 논제)
-- ========================================
insert into public.issues (title, summary, description, category, party, pro_summary, con_summary, featured, status, agree_count, disagree_count, comment_count) values
(
  '반도체 산업 국가지원 특별법',
  '반도체 기업에 세액공제 최대 25% 확대 및 국가 보조금 지원을 위한 특별법 제정 논의',
  '글로벌 반도체 패권 경쟁에서 대한민국의 경쟁력 유지를 위해 삼성·SK하이닉스 등 국내 반도체 기업에 대규모 국가 지원이 필요하다는 주장과, 대기업 특혜·재정 부담 우려가 맞서고 있습니다.',
  '경제',
  '공통',
  '미국·중국·EU가 자국 반도체 산업에 막대한 보조금을 지원하는 상황에서 국가 지원 없이는 글로벌 경쟁에서 뒤처질 수 있습니다. 고용 창출과 기술 자립 효과도 큽니다.',
  '대기업 위주의 특혜성 지원으로 중소기업과의 형평성 문제가 있으며, 천문학적 재정 지출이 국민 세부담으로 돌아올 수 있습니다.',
  true, 'active', 12847, 8934, 342
),
(
  '최저임금 1만 2,000원 인상안',
  '2026년 최저임금을 현재 대비 약 5.4% 인상한 1만 2,000원으로 결정하는 안',
  '노동계는 물가 상승과 생계비 증가를 반영해 더 높은 인상을 요구하는 반면, 경영계는 소상공인과 중소기업의 경영 부담 가중을 이유로 반대하고 있습니다.',
  '경제',
  '공통',
  '물가 상승으로 실질 임금이 떨어진 저임금 노동자의 생계를 보호하고, 내수 소비 진작 효과를 기대할 수 있습니다.',
  '인건비 부담이 커지면 소상공인·자영업자가 폐업하거나 고용을 줄일 수 있으며, 결국 취약계층에게 역효과가 날 수 있습니다.',
  true, 'active', 21453, 19876, 892
),
(
  '군 복무기간 단축 (18개월 → 16개월)',
  '현행 육군 기준 18개월 복무기간을 16개월로 단축하는 병역법 개정안',
  '청년들의 경력 단절을 최소화하고 저출생 대응 차원에서 복무기간 단축이 필요하다는 주장과, 안보 공백 및 전력 약화 우려가 대립하고 있습니다.',
  '안보',
  '공통',
  '청년의 사회 진출 시기를 앞당기고 인구 감소 시대에 경제활동 인구를 늘릴 수 있습니다. 스마트 국방 전환으로 충분히 전력을 유지할 수 있습니다.',
  '북한 핵·미사일 위협이 고조되는 상황에서 복무기간 단축은 군 전투력 약화로 이어질 수 있으며, 충분한 훈련 시간을 확보하기 어렵습니다.',
  false, 'active', 34521, 28765, 1204
),
(
  '저출생 대응 출산장려금 월 100만원 지급',
  '신생아 출생 후 1년간 월 100만원 출산지원금 지급 및 육아휴직급여 확대 정책',
  '세계 최저 수준의 합계출산율(0.72명) 위기를 극복하기 위한 현금 지원 확대 정책입니다. 실효성 논란과 재원 마련 방안이 핵심 쟁점입니다.',
  '복지',
  '공통',
  '출산·양육의 경제적 부담을 직접 줄여주는 실질적인 지원이며, 육아 기간 소득 안정으로 출산 기피 현상을 완화할 수 있습니다.',
  '현금 지원만으로는 구조적 저출생 문제 해결이 어렵습니다. 연간 수십조 원의 재정 부담이 발생하며, 다른 복지 예산을 줄여야 할 수 있습니다.',
  false, 'active', 45231, 12043, 2341
),
(
  '의대 정원 확대 (2,000명 증원)',
  '의과대학 입학 정원을 현재 3,058명에서 5,058명으로 확대하는 정책',
  '의사 수 부족으로 인한 지역·필수의료 붕괴를 해결하기 위한 정원 확대 정책과 의사 집단의 반발이 첨예하게 대립하고 있습니다.',
  '의료',
  '공통',
  'OECD 평균 대비 의사 수가 부족하며, 특히 농어촌 지역과 응급·소아과 등 필수의료 분야의 의사 부족이 심각합니다. 10년 후를 대비해 지금 증원이 필요합니다.',
  '단순 증원보다 의사의 지역 배치와 처우 개선이 선행되어야 합니다. 갑작스러운 대규모 증원은 의학교육 질 저하와 의료시장 과잉 경쟁을 초래할 수 있습니다.',
  true, 'active', 67432, 54321, 4521
);
