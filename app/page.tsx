import { createClient } from '@/lib/supabase/server'
import IssueCard from '@/components/IssueCard'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import LoginButton from '@/components/LoginButton'
import Link from 'next/link'
import { Issue } from '@/types'
import { MOCK_ISSUES } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

const CATEGORIES = ['전체', '경제', '안보', '복지', '교육', '의료', '정치']

const IS_DEMO = !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co') ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')

interface Props {
  searchParams: Promise<{ category?: string }>
}

export default async function HomePage({ searchParams }: Props) {
  const { category } = await searchParams
  const activeCategory = category || '전체'

  let issueList: Issue[] = []
  let user = null
  const userVotes: Record<string, 'agree' | 'disagree'> = {}
  let announcement: { message: string } | null = null

  if (IS_DEMO) {
    issueList = activeCategory === '전체'
      ? MOCK_ISSUES
      : MOCK_ISSUES.filter(i => i.category === activeCategory)
  } else {
    try {
      const supabase = await createClient()
      const { data: { user: u } } = await supabase.auth.getUser()
      user = u

      let query = supabase
        .from('issues')
        .select('*')
        .eq('status', 'active')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20)

      if (activeCategory !== '전체') {
        query = query.eq('category', activeCategory)
      }

      const { data: issues } = await query
      issueList = (issues ?? []) as Issue[]

      if (user && issueList.length > 0) {
        const { data: votes } = await supabase
          .from('votes')
          .select('issue_id, vote_type')
          .eq('user_id', user.id)
          .in('issue_id', issueList.map(i => i.id))
        Object.assign(userVotes, Object.fromEntries((votes ?? []).map(v => [v.issue_id, v.vote_type])))
      }

      const { data: ann } = await supabase
        .from('announcements')
        .select('message')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (ann) announcement = ann
    } catch {
      issueList = MOCK_ISSUES
    }
  }

  return (
    <div className="min-h-dvh bg-[#F5F5F7]">
      <TopBar
        showLogo
        rightAction={user ? (
          <Link href="/profile">
            <div className="w-8 h-8 rounded-full bg-[#0038A8] flex items-center justify-center">
              <span className="text-white text-xs font-bold">나</span>
            </div>
          </Link>
        ) : (
          <LoginButton />
        )}
      />

      {/* Category filter */}
      <div className="fixed top-[56px] left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-[#F5F5F7] z-30 px-4 py-2.5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map(cat => (
            <Link
              key={cat}
              href={cat === '전체' ? '/' : `/?category=${encodeURIComponent(cat)}`}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors btn-press whitespace-nowrap"
              style={{
                background: activeCategory === cat ? '#0038A8' : 'white',
                color: activeCategory === cat ? 'white' : '#78716C',
                border: activeCategory === cat ? 'none' : '1px solid #E5E7EB',
              }}
            >
              {cat}
            </Link>
          ))}
        </div>
      </div>

      {/* Main feed */}
      <div className="pt-[112px] pb-[84px] px-4 space-y-3">
        {/* Service banner — always visible */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0038A8 0%, #1a56d6 60%, #003b93 100%)' }}>
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] text-white/60 font-semibold tracking-widest uppercase mb-0.5">KOVO</p>
                <h2 className="text-[16px] font-black text-white leading-tight">편향 없이, 내 시각으로</h2>
                <p className="text-[12px] text-white/75 mt-1 leading-relaxed">
                  논제만 보고 투표하세요. 투표 후에야<br/>발의 정당과 인구통계 인사이트가 공개됩니다.
                </p>
              </div>
            </div>
          </div>
          {announcement ? (
            <>
              <div className="h-0.5 bg-white/10" />
              <div className="px-4 py-2.5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                <span className="text-[11px] text-white/80 leading-relaxed">{announcement.message}</span>
              </div>
            </>
          ) : (
            <>
              <div className="h-0.5 bg-white/10" />
              <div className="px-4 py-2.5 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#C60C30]" />
                <span className="text-[11px] text-white/60">투표는 한 번만 가능하며 철회할 수 없습니다</span>
              </div>
            </>
          )}
        </div>

        {issueList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <span className="text-3xl">🗳️</span>
            </div>
            <p className="text-[15px] font-medium text-gray-500">아직 논제가 없습니다</p>
            <p className="text-[13px] text-gray-400 mt-1">곧 새로운 안건이 등록됩니다</p>
          </div>
        ) : (
          issueList.map(issue => (
            <div key={issue.id} className="fade-in-up">
              <IssueCard
                issue={issue}
                userVote={userVotes[issue.id] ?? null}
              />
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  )
}
