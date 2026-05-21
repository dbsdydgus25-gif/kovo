# 민심 배포 가이드

## 1. Supabase 프로젝트 생성

1. https://supabase.com → 새 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 전체 실행
3. Authentication → Providers에서 **Google**, **Kakao** 활성화
   - Google: Google Cloud Console에서 OAuth 클라이언트 ID 발급
   - Kakao: 카카오 개발자센터에서 앱 생성 후 REST API 키 입력
4. Authentication → URL Configuration:
   - Site URL: `https://your-domain.vercel.app`
   - Redirect URLs: `https://your-domain.vercel.app/auth/callback`

## 2. 열린국회정보 API 키 발급

1. https://open.assembly.go.kr 접속
2. 회원가입 → 서비스 신청
3. `nwbillbill` (의안목록) 서비스 신청 → API 키 발급 (즉시 발급)

## 3. Vercel 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 루트에서
vercel

# 환경 변수 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ASSEMBLY_API_KEY
vercel env add CRON_SECRET   # 아무 랜덤 문자열
```

또는 Vercel 대시보드 → Project → Settings → Environment Variables에서 추가

## 4. 배포 후 확인

- Cron Job: Vercel 대시보드 → Functions → Crons에서 확인 (매일 오전 6시 국회 API 동기화)
- 수동 동기화: `POST /api/assembly/sync` (Authorization: Bearer {CRON_SECRET})

## 환경 변수 목록

| 변수 | 필수 | 설명 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase Service Role Key (서버 전용) |
| `ASSEMBLY_API_KEY` | 선택 | 없으면 mock 데이터 사용 |
| `CRON_SECRET` | 선택 | API 동기화 보호용 시크릿 |
