import { createClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import LoginButton from '@/components/LoginButton'
import NotificationBell from '@/components/NotificationBell'
import SearchButton from '@/components/SearchButton'
import HomeBanner from '@/components/HomeBanner'
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
        .limit(10)

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
        leftAction={<SearchButton />}
        rightAction={user ? (
          <div className="flex items-center gap-1">
            <NotificationBell userId={user.id} />
            <Link href="/profile">
              <div className="w-8 h-8 rounded-full bg-[#0038A8] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" fill="white"/>
                  <path d="M4 20C4 17 7.6 14 12 14C16.4 14 20 17 20 20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </Link>
          </div>
        ) : (
          <LoginButton />
        )}
      />

      {/* Main feed */}
      <div className="pt-[156px] pb-[84px] px-4 space-y-3">
        {/* 자동 슬라이드 배너 */}
        <HomeBanner announcement={announcement?.message ?? null} />

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
