import { createClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import ProfileClient from './ProfileClient'
import LoginButton from '@/components/LoginButton'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-dvh bg-[#F5F5F7]">
        <TopBar title="내 정보" />
        <div className="flex flex-col items-center justify-center px-8 text-center" style={{ minHeight: '100dvh' }}>
          <div className="w-20 h-20 rounded-full bg-white border border-gray-100 flex items-center justify-center mx-auto mb-5 shadow-sm">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="#9CA3AF" strokeWidth="2"/>
              <path d="M4 20C4 17 7.6 14 12 14C16.4 14 20 17 20 20" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-[20px] font-black text-[#1C1917] mb-2">로그인이 필요해요</h2>
          <p className="text-[13px] text-gray-400 leading-relaxed mb-7">
            투표 기록, 성향 분석 등<br/>
            다양한 정보를 확인하려면<br/>
            로그인해주세요
          </p>
          <LoginButton />
        </div>
        <BottomNav />
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, age_group, gender, region, occupation, tendency_data, tendency_updated_at')
    .eq('id', user.id)
    .single()

  const { data: rawVotes } = await supabase
    .from('votes')
    .select(`
      vote_type,
      created_at,
      issue_id,
      issues (
        id,
        title,
        category,
        agree_count,
        disagree_count
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: rawComments } = await supabase
    .from('comments')
    .select(`
      id,
      content,
      vote_type,
      likes,
      created_at,
      issue_id,
      issues (
        id,
        title,
        category
      )
    `)
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(30)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const votes = (rawVotes ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myComments = (rawComments ?? []) as any[]

  return (
    <div className="min-h-dvh bg-[#F5F5F7]">
      <TopBar title="내 정보" />
      <div className="pt-[72px] pb-[84px]">
        <ProfileClient
          user={user}
          votes={votes}
          myComments={myComments}
          displayName={profile?.display_name ?? null}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          savedTendency={(profile as any)?.tendency_data ?? null}
        />
      </div>
      <BottomNav />
    </div>
  )
}
