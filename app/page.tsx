import { createClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import LoginButton from '@/components/LoginButton'
import NotificationBell from '@/components/NotificationBell'
import IssueList from '@/components/IssueList'
import Link from 'next/link'
import { Issue } from '@/types'
import { MOCK_ISSUES } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

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
        leftAction={user ? <NotificationBell userId={user.id} /> : undefined}
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

      {/* Main feed */}
      <div className="pt-[156px] pb-[84px] px-4 space-y-3">
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

        <IssueList
          initialIssues={issueList}
          initialUserVotes={userVotes}
          userId={user?.id ?? null}
        />
      </div>

      <BottomNav />
    </div>
  )
}
